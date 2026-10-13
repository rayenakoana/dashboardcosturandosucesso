/**
 * Lógica pura do handler com dependências injetáveis para facilitar testes.
 * index.ts instancia com as deps reais; index.test.ts injeta mocks.
 */

export interface HandlerDeps {
  getEnv: (key: string) => string | undefined;
  getUser: (token: string) => Promise<{
    user: { id: string; app_metadata?: Record<string, unknown> } | null;
    error: Error | null;
  }>;
  fetchN8n: (url: string, secret: string, email: string, senha: string) => Promise<Response>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const BODY_LIMIT_BYTES = 4 * 1024;
// 1 KB é suficiente para {"sucesso":true} — limita materialização da resposta do n8n.
const N8N_RESPONSE_LIMIT_BYTES = 1024;
const SENHA_MIN_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errResp(msg: string, status: number): Response {
  return new Response(
    JSON.stringify({ sucesso: false, mensagem: msg }),
    { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

// Lê um ReadableStream byte a byte até `limit`. Retorna:
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

export function createHandler(deps: HandlerDeps) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
    }

    // ── 1. Autenticação ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errResp("Não autenticado.", 401);
    }
    const token = authHeader.slice(7);

    let getUserResult: { user: { id: string; app_metadata?: Record<string, unknown> } | null; error: Error | null };
    try {
      getUserResult = await deps.getUser(token);
    } catch {
      // Falha de infraestrutura (rede, TLS, timeout do cliente Supabase) —
      // distinta de token inválido: não é culpa do chamador.
      console.error("[admin-criar-usuario] deps.getUser lançou exceção");
      return errResp("Serviço de autenticação indisponível.", 503);
    }
    const { user, error: authError } = getUserResult;
    if (authError || !user) {
      return errResp("Token inválido ou expirado.", 401);
    }

    // ── 2. Autorização ────────────────────────────────────────────────────────
    if (user.app_metadata?.role !== "admin") {
      return errResp("Acesso restrito a administradores.", 403);
    }

    // ── 3. Corpo — limite imposto durante a leitura do stream ─────────────────
    const bodyBytes = await readStreamWithLimit(req.body, BODY_LIMIT_BYTES);
    if (bodyBytes === null) {
      return errResp("Requisição muito grande.", 413);
    }
    if (bodyBytes === "error") {
      return errResp("Erro ao ler corpo da requisição.", 400);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(new TextDecoder().decode(bodyBytes));
      if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new Error("não é objeto");
      }
    } catch {
      return errResp("Corpo da requisição inválido.", 400);
    }

    // ── 4. Validação ──────────────────────────────────────────────────────────
    const email = body.email;
    if (typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254) {
      return errResp("Email inválido.", 400);
    }

    const senha = body.senha;
    if (typeof senha !== "string" || senha.length < SENHA_MIN_LENGTH) {
      return errResp(`Senha deve ter ao menos ${SENHA_MIN_LENGTH} caracteres.`, 400);
    }

    // ── 5. Configuração do n8n ────────────────────────────────────────────────
    const n8nUrl = deps.getEnv("N8N_ADMIN_URL");
    const n8nSecret = deps.getEnv("N8N_ADMIN_SECRET");

    if (!n8nUrl || !n8nSecret) {
      console.error("[admin-criar-usuario] N8N_ADMIN_URL ou N8N_ADMIN_SECRET não configurados.");
      return errResp("Serviço indisponível.", 503);
    }

    if (!n8nUrl.startsWith("https://")) {
      console.error("[admin-criar-usuario] N8N_ADMIN_URL não usa HTTPS.");
      return errResp("Configuração inválida do serviço.", 503);
    }

    // ── 6. Chamada ao n8n ─────────────────────────────────────────────────────
    let n8nRes: Response;
    try {
      n8nRes = await deps.fetchN8n(n8nUrl, n8nSecret, email, senha);
    } catch (err) {
      const msg = (err as Error).name === "AbortError"
        ? "Timeout ao contatar serviço de cadastro."
        : "Erro de conexão com o serviço de cadastro.";
      console.error("[admin-criar-usuario] fetch n8n falhou:", (err as Error).message);
      return errResp(msg, 502);
    }

    // ── 7. Validação da resposta do n8n ───────────────────────────────────────
    // Erros HTTP do n8n (4xx/5xx): descarta o corpo e normaliza para 422 —
    // nunca vazamos o status interno (ex: 401 = secret errado).
    if (!n8nRes.ok) {
      n8nRes.body?.cancel().catch(() => {});
      return errResp("Falha ao criar usuário.", 422);
    }

    // n8n retornou 2xx: lê o corpo com limite e valida o contrato JSON.
    // Corpo vazio, JSON inválido, sucesso !== true ou body excessivamente grande
    // são tratados como falha controlada — o frontend nunca recebe dados internos.
    const n8nBodyBytes = await readStreamWithLimit(n8nRes.body, N8N_RESPONSE_LIMIT_BYTES);

    if (n8nBodyBytes === null || n8nBodyBytes === "error") {
      console.error("[admin-criar-usuario] corpo da resposta n8n inválido ou excessivamente grande");
      return errResp("Falha ao criar usuário.", 422);
    }

    let n8nJson: unknown;
    try {
      n8nJson = JSON.parse(new TextDecoder().decode(n8nBodyBytes));
    } catch {
      console.error("[admin-criar-usuario] resposta n8n não é JSON válido");
      return errResp("Falha ao criar usuário.", 422);
    }

    if (
      typeof n8nJson !== "object" ||
      n8nJson === null ||
      Array.isArray(n8nJson) ||
      (n8nJson as Record<string, unknown>).sucesso !== true
    ) {
      return errResp("Falha ao criar usuário.", 422);
    }

    // Contrato confirmado — retorna apenas mensagem hardcoded, zero campos do n8n.
    return new Response(
      JSON.stringify({ sucesso: true, mensagem: "Usuário criado com sucesso." }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  };
}
