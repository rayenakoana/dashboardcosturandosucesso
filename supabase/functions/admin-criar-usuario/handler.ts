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
const SENHA_MIN_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errResp(msg: string, status: number): Response {
  return new Response(
    JSON.stringify({ sucesso: false, mensagem: msg }),
    { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

async function readBodyWithLimit(req: Request, limit: number): Promise<ArrayBuffer | null> {
  const reader = req.body?.getReader();
  if (!reader) return new ArrayBuffer(0);

  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
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

    const { user, error: authError } = await deps.getUser(token);
    if (authError || !user) {
      return errResp("Token inválido ou expirado.", 401);
    }

    // ── 2. Autorização ────────────────────────────────────────────────────────
    if (user.app_metadata?.role !== "admin") {
      return errResp("Acesso restrito a administradores.", 403);
    }

    // ── 3. Corpo — limite imposto durante a leitura do stream ─────────────────
    const bodyBytes = await readBodyWithLimit(req, BODY_LIMIT_BYTES);
    if (bodyBytes === null) {
      return errResp("Requisição muito grande.", 413);
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

    // Descarta o corpo do n8n — frontend nunca recebe dados internos do n8n.
    n8nRes.body?.cancel();

    const sucesso = n8nRes.ok;
    return new Response(
      JSON.stringify({
        sucesso,
        mensagem: sucesso ? "Usuário criado com sucesso." : "Falha ao criar usuário.",
      }),
      {
        status: sucesso ? 200 : (n8nRes.status >= 400 ? n8nRes.status : 500),
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  };
}
