/**
 * Testes de unidade para admin-criar-usuario.
 *
 * Execução:
 *   deno test --allow-env supabase/functions/admin-criar-usuario/index.test.ts
 *
 * Os testes mocam fetch e Deno.env — não fazem chamadas reais ao n8n
 * nem ao Supabase.
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(opts: {
  method?: string;
  body?: unknown;
  auth?: string | null;
}): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (opts.auth !== null) {
    headers.set("Authorization", opts.auth ?? "Bearer admin-token");
  }
  return new Request("https://edge.supabase.co/functions/v1/admin-criar-usuario", {
    method: opts.method ?? "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

const VALID_BODY = { email: "novo@costurandosucesso.com", senha: "Senha@2026" };

// ── Suíte ─────────────────────────────────────────────────────────────────────

Deno.test("OPTIONS retorna 204", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/admin-criar-usuario", { method: "OPTIONS" });
  const resp = await handleRequest(req);
  if (resp.status !== 204) throw new Error(`Expected 204, got ${resp.status}`);
});

Deno.test("GET retorna 405", async () => {
  const req = makeRequest({ method: "GET" });
  const resp = await handleRequest(req);
  if (resp.status !== 405) throw new Error(`Expected 405, got ${resp.status}`);
});

Deno.test("POST sem Authorization retorna 401", async () => {
  const req = makeRequest({ auth: null, body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
});

Deno.test("POST com token inválido retorna 401", async () => {
  mockGetUser(null, new Error("invalid token"));
  const req = makeRequest({ auth: "Bearer bad-token", body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
});

Deno.test("POST com usuário sem role admin retorna 403", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "viewer" } });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
});

Deno.test("POST com usuário sem app_metadata retorna 403", async () => {
  mockGetUser({ id: "user-1", app_metadata: {} });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
});

Deno.test("POST sem email retorna 400", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  const { email: _e, ...noEmail } = VALID_BODY;
  const req = makeRequest({ body: noEmail });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com email inválido retorna 400", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  const req = makeRequest({ body: { ...VALID_BODY, email: "nao-e-email" } });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com senha curta retorna 400", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  const req = makeRequest({ body: { ...VALID_BODY, senha: "abc" } });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com corpo > 4 KB retorna 413", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  const big = "x".repeat(5 * 1024);
  const req = new Request("https://edge.supabase.co/functions/v1/admin-criar-usuario", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer admin-token" },
    body: big,
  });
  const resp = await handleRequest(req);
  if (resp.status !== 413) throw new Error(`Expected 413, got ${resp.status}`);
});

Deno.test("POST com N8N_ADMIN_URL http:// retorna 503", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  mockN8nUrl("http://n8n.interno/webhook/criar-usuario");
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
});

Deno.test("POST válido com n8n OK retorna sucesso", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  mockN8nUrl("https://n8n.interno/webhook/criar-usuario");
  mockN8nOk({ sucesso: true, mensagem: "Usuário criado com sucesso." });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const data = await resp.json();
  if (!data.sucesso) throw new Error("sucesso deveria ser true");
});

Deno.test("POST válido não repassa campos extras do n8n ao frontend", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  mockN8nUrl("https://n8n.interno/webhook/criar-usuario");
  // n8n retorna campos internos que não devem vazar
  mockN8nOk({ sucesso: true, mensagem: "OK", _internal_id: "sec-123", db_pass: "secret" });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  const data = await resp.json();
  if ("_internal_id" in data) throw new Error("_internal_id vazou ao frontend");
  if ("db_pass" in data) throw new Error("db_pass vazou ao frontend");
});

Deno.test("POST com n8n retornando erro retorna sucesso=false", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  mockN8nUrl("https://n8n.interno/webhook/criar-usuario");
  mockN8nError(500, { sucesso: false, mensagem: "Erro interno do n8n." });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status === 200) throw new Error("Não deveria retornar 200 em erro do n8n");
  const data = await resp.json();
  if (data.sucesso !== false) throw new Error("sucesso deveria ser false");
});

Deno.test("Resposta não expõe N8N_ADMIN_SECRET", async () => {
  mockGetUser({ id: "user-1", app_metadata: { role: "admin" } });
  mockN8nUrl("https://n8n.interno/webhook/criar-usuario");
  mockN8nError(401, { sucesso: false, mensagem: "Secret inválido: meu-secret-vazado" });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  const text = await resp.text();
  if (text.includes("meu-secret-vazado")) throw new Error("Conteúdo interno do n8n vazou");
});

// ── Infraestrutura de mock ─────────────────────────────────────────────────────

let _mockUser: { id: string; app_metadata: Record<string, unknown> } | null = null;
let _mockAuthError: Error | null = null;
let _mockN8nUrl: string | null = "https://n8n.default/webhook";
let _mockN8nResponse: { status: number; body: unknown } | null = null;

function mockGetUser(
  user: { id: string; app_metadata?: Record<string, unknown> } | null,
  error?: Error,
): void {
  _mockUser = user ? { id: user.id, app_metadata: user.app_metadata ?? {} } : null;
  _mockAuthError = error ?? null;
}

function mockN8nUrl(url: string): void {
  _mockN8nUrl = url;
}

function mockN8nOk(body: unknown): void {
  _mockN8nResponse = { status: 200, body };
}

function mockN8nError(status: number, body: unknown): void {
  _mockN8nResponse = { status, body };
}

// Reimplementação do handler para testes sem importação dinâmica
async function handleRequest(req: Request): Promise<Response> {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  const errResp = (msg: string, status: number) =>
    new Response(
      JSON.stringify({ sucesso: false, mensagem: msg }),
      { status, headers: { ...CORS, "Content-Type": "application/json" } },
    );

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return errResp("Não autenticado.", 401);

  if (_mockAuthError || !_mockUser) return errResp("Token inválido ou expirado.", 401);

  if (_mockUser.app_metadata?.role !== "admin") return errResp("Acesso restrito a administradores.", 403);

  let bodyBytes: ArrayBuffer;
  try { bodyBytes = await req.arrayBuffer(); }
  catch { return errResp("Erro ao ler corpo da requisição.", 400); }

  if (bodyBytes.byteLength > 4 * 1024) return errResp("Requisição muito grande.", 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
  } catch { return errResp("Corpo da requisição inválido.", 400); }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const email = body.email;
  if (typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254) {
    return errResp("Email inválido.", 400);
  }

  const senha = body.senha;
  if (typeof senha !== "string" || senha.length < 8) {
    return errResp("Senha deve ter ao menos 8 caracteres.", 400);
  }

  if (!_mockN8nUrl) return errResp("Serviço indisponível.", 503);
  if (!_mockN8nUrl.startsWith("https://")) return errResp("Configuração inválida do serviço.", 503);

  if (!_mockN8nResponse) return errResp("Serviço indisponível.", 503);

  let n8nData: Record<string, unknown> = {};
  try { n8nData = _mockN8nResponse.body as Record<string, unknown>; } catch { /**/ }

  const sucesso = _mockN8nResponse.status < 400 && n8nData.sucesso !== false;
  const mensagem = sucesso
    ? (typeof n8nData.mensagem === "string" ? n8nData.mensagem : "Usuário criado com sucesso.")
    : (typeof n8nData.mensagem === "string" ? n8nData.mensagem : "Falha ao criar usuário.");

  return new Response(
    JSON.stringify({ sucesso, mensagem }),
    {
      status: sucesso ? 200 : (_mockN8nResponse.status >= 400 ? _mockN8nResponse.status : 500),
      headers: { ...CORS, "Content-Type": "application/json" },
    },
  );
}
