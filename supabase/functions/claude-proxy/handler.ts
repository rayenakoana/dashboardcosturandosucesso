/**
 * Lógica pura do handler com dependências injetáveis para facilitar testes.
 * index.ts instancia com as deps reais; index.test.ts injeta mocks.
 *
 * Rate limiting é OBRIGATÓRIO — a RPC check_and_log_ai_call deve ser
 * executada e retornar { allowed: true } para que qualquer chamada à
 * Anthropic seja liberada. Falha no RPC ou resposta inválida bloqueiam
 * a chamada (fail-closed), independente de qualquer configuração.
 */

export interface HandlerDeps {
  getEnv: (key: string) => string | undefined;
  getUser: (token: string) => Promise<{
    user: { id: string } | null;
    error: Error | null;
  }>;
  rpcRateLimit: (userId: string, model: string) => Promise<{
    data: { allowed: boolean } | null;
    error: Error | null;
  }>;
  fetchAnthropic: (payload: unknown, key: string) => Promise<Response>;
}

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// Limite real lido durante o streaming — independente do Content-Length.
const BODY_LIMIT_BYTES = 64 * 1024;

// Limite de leitura da resposta da Anthropic.
const ANTHROPIC_RESPONSE_LIMIT_BYTES = 256 * 1024;

const ALLOWED_MODELS = new Set([
  "claude-sonnet-5-5",
]);

const MAX_TOKENS_CAP = 2048;
const MAX_MESSAGES = 20;

// Lê um ReadableStream incrementalmente até `limit`. Retorna:
//   ArrayBuffer  — leitura completa dentro do limite
//   null         — stream excedeu o limite (cancelado)
//   "error"      — stream lançou exceção durante a leitura
async function readStreamWithLimit(
  stream: ReadableStream<Uint8Array> | null | undefined,
  limit: number,
): Promise<ArrayBuffer | null | "error"> {
  if (!stream) return new ArrayBuffer(0);

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return "error";
  } finally {
    reader.releaseLock();
  }

  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buf.buffer;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function errResp(cors: Record<string, string>, msg: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: msg }),
    { status, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

export function createHandler(deps: HandlerDeps) {
  return async (req: Request): Promise<Response> => {
    const allowedOrigin = deps.getEnv("ALLOWED_ORIGIN") ?? "*";
    const CORS = corsHeaders(allowedOrigin);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS });
    }

    // ── 1. Autenticação ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errResp(CORS, "Não autenticado.", 401);
    }
    const token = authHeader.slice(7);

    let getUserResult: { user: { id: string } | null; error: Error | null };
    try {
      getUserResult = await deps.getUser(token);
    } catch {
      // Falha de infraestrutura — não é token inválido.
      console.error("[claude-proxy] deps.getUser lançou exceção");
      return errResp(CORS, "Serviço de autenticação indisponível.", 503);
    }

    const { user, error: authError } = getUserResult;
    if (authError || !user) {
      return errResp(CORS, "Token inválido ou expirado.", 401);
    }

    // ── 2. Corpo — leitura incremental com limite ─────────────────────────────
    const bodyBytes = await readStreamWithLimit(req.body, BODY_LIMIT_BYTES);
    if (bodyBytes === null) {
      return errResp(CORS, "Requisição muito grande.", 413);
    }
    if (bodyBytes === "error") {
      return errResp(CORS, "Erro ao ler corpo da requisição.", 400);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(new TextDecoder().decode(bodyBytes));
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new Error("não é objeto");
      }
    } catch {
      return errResp(CORS, "Corpo da requisição inválido.", 400);
    }

    // ── 3. Validar modelo ─────────────────────────────────────────────────────
    const requestedModel = typeof body.model === "string" ? body.model : "";
    if (!ALLOWED_MODELS.has(requestedModel)) {
      return errResp(CORS, "Modelo não permitido.", 400);
    }

    // ── 4. Validar e capear max_tokens ────────────────────────────────────────
    // Rejeita tipos inválidos antes de qualquer aritmética.
    const rawTokens = body.max_tokens;
    if (rawTokens !== undefined) {
      if (
        typeof rawTokens !== "number" ||
        !Number.isFinite(rawTokens) ||
        !Number.isInteger(rawTokens) ||
        rawTokens < 1
      ) {
        return errResp(CORS, "max_tokens deve ser um inteiro positivo.", 400);
      }
    }
    const safeMaxTokens = rawTokens === undefined
      ? MAX_TOKENS_CAP
      : Math.min(rawTokens as number, MAX_TOKENS_CAP);

    // ── 5. Validar messages ───────────────────────────────────────────────────
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return errResp(CORS, "messages deve ser um array não vazio.", 400);
    }
    if (body.messages.length > MAX_MESSAGES) {
      return errResp(CORS, "Número de mensagens excede o limite.", 400);
    }

    // ── 6. Rate limiting — obrigatório (fail-closed) ──────────────────────────
    // A RPC deve ser executada e retornar { allowed: true }.
    // Qualquer falha (exceção, erro RPC, resultado inválido ou null) bloqueia
    // a chamada à Anthropic.
    let rlData: { allowed: boolean } | null = null;
    let rlError: Error | null = null;
    try {
      ({ data: rlData, error: rlError } = await deps.rpcRateLimit(user.id, requestedModel));
    } catch {
      console.error("[claude-proxy] rpcRateLimit lançou exceção");
      return errResp(CORS, "Serviço temporariamente indisponível.", 503);
    }

    if (rlError) {
      console.error("[claude-proxy] rate limit RPC retornou erro");
      return errResp(CORS, "Serviço temporariamente indisponível.", 503);
    }

    if (!rlData || typeof rlData.allowed !== "boolean") {
      console.error("[claude-proxy] rate limit RPC retornou resposta inválida");
      return errResp(CORS, "Serviço temporariamente indisponível.", 503);
    }

    if (!rlData.allowed) {
      return errResp(CORS, "Limite de chamadas atingido. Tente novamente em alguns minutos.", 429);
    }

    // ── 7. Construir payload com allowlist de campos ──────────────────────────
    const anthropicBody: Record<string, unknown> = {
      model: requestedModel,
      max_tokens: safeMaxTokens,
      messages: body.messages,
    };
    if (typeof body.system === "string" && body.system.length > 0) {
      anthropicBody.system = body.system;
    }

    // ── 8. Obter chave Anthropic ──────────────────────────────────────────────
    const anthropicKey = deps.getEnv("ANTHROPIC_KEY");
    if (!anthropicKey) {
      console.error("[claude-proxy] ANTHROPIC_KEY não configurada.");
      return errResp(CORS, "Serviço indisponível.", 503);
    }

    // ── 9. Chamar Anthropic ───────────────────────────────────────────────────
    let anthropicRes: Response;
    try {
      anthropicRes = await deps.fetchAnthropic(anthropicBody, anthropicKey);
    } catch {
      console.error("[claude-proxy] Falha ao contatar Anthropic");
      return errResp(CORS, "Erro de conexão com o serviço de IA.", 502);
    }

    // ── 10. Validar e repassar resposta ───────────────────────────────────────
    if (!anthropicRes.ok) {
      let errorType = "unknown";

      const errorBytes = await readStreamWithLimit(anthropicRes.body, 4096);
      if (errorBytes instanceof ArrayBuffer) {
        try {
          const errorData = JSON.parse(new TextDecoder().decode(errorBytes));
          const allowedTypes = new Set([
            "invalid_request_error",
            "authentication_error",
            "permission_error",
            "not_found_error",
            "rate_limit_error",
            "api_error",
            "overloaded_error",
          ]);
          const candidate = errorData?.error?.type;
          if (typeof candidate === "string" && allowedTypes.has(candidate)) {
            errorType = candidate;
          }
        } catch {
          // Resposta inválida: não registrar seu conteúdo.
        }
      }

      console.error(
        "[claude-proxy] Anthropic retornou status:",
        anthropicRes.status,
        "tipo:",
        errorType,
      );

      // Nunca repassar detalhes internos da Anthropic ao frontend.
      return errResp(CORS, "Erro no serviço de IA.", 502);
    }

    // Lê resposta com limite para evitar materialização irrestrita.
    const respBytes = await readStreamWithLimit(anthropicRes.body, ANTHROPIC_RESPONSE_LIMIT_BYTES);
    if (respBytes === null || respBytes === "error") {
      console.error("[claude-proxy] resposta Anthropic inválida ou excessivamente grande");
      return errResp(CORS, "Erro no serviço de IA.", 502);
    }

    // Validar que a resposta é JSON antes de repassar ao frontend.
    // Garante que nunca enviamos bytes binários ou texto não estruturado.
    let anthropicJson: unknown;
    try {
      anthropicJson = JSON.parse(new TextDecoder().decode(respBytes));
    } catch {
      console.error("[claude-proxy] resposta Anthropic não é JSON válido");
      return errResp(CORS, "Erro no serviço de IA.", 502);
    }

    // Preservar o contrato de sucesso: repassa o JSON da Anthropic integralmente.
    return new Response(JSON.stringify(anthropicJson), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  };
}
