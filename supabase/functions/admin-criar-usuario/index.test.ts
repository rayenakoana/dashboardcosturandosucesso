/**
 * Testes de unidade para admin-criar-usuario.
 *
 * Execução:
 *   deno test --allow-env supabase/functions/admin-criar-usuario/index.test.ts
 *
 * Os testes mocam as deps do handler — não fazem chamadas reais ao n8n
 * nem ao Supabase.
 */

import { createHandler, type HandlerDeps } from "./handler.ts";

// ── Estado dos mocks ───────────────────────────────────────────────────────────

type MockUser = { id: string; app_metadata?: Record<string, unknown> } | null;

let _mockUser: MockUser = null;
let _mockAuthError: Error | null = null;
let _mockN8nUrl: string | null = "https://n8n.default/webhook";
let _mockN8nResponse: { status: number } | null = null;

function resetMocks(): void {
  _mockUser = { id: "user-1", app_metadata: { role: "admin" } };
  _mockAuthError = null;
  _mockN8nUrl = "https://n8n.default/webhook";
  _mockN8nResponse = { status: 200 };
}

// ── Factory do handler com deps mockadas ──────────────────────────────────────

function makeHandler(): (req: Request) => Promise<Response> {
  const deps: HandlerDeps = {
    getEnv: (key) => {
      if (key === "N8N_ADMIN_URL") return _mockN8nUrl ?? undefined;
      if (key === "N8N_ADMIN_SECRET") return _mockN8nUrl ? "mock-secret" : undefined;
      return undefined;
    },
    getUser: async (_token) => ({
      user: _mockUser ?? null,
      error: _mockAuthError,
    }),
    fetchN8n: async (_url, _secret, _email, _senha) => {
      if (!_mockN8nResponse) throw new Error("fetchN8n não configurado");
      return new Response(null, { status: _mockN8nResponse.status });
    },
  };
  return createHandler(deps);
}

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

// ── Testes ────────────────────────────────────────────────────────────────────

Deno.test("OPTIONS retorna 204", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = new Request("https://edge.supabase.co/functions/v1/admin-criar-usuario", { method: "OPTIONS" });
  const resp = await handler(req);
  if (resp.status !== 204) throw new Error(`Expected 204, got ${resp.status}`);
});

Deno.test("GET retorna 405", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = makeRequest({ method: "GET" });
  const resp = await handler(req);
  if (resp.status !== 405) throw new Error(`Expected 405, got ${resp.status}`);
});

Deno.test("POST sem Authorization retorna 401", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = makeRequest({ auth: null, body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
});

Deno.test("POST com token inválido retorna 401", async () => {
  resetMocks();
  _mockUser = null;
  _mockAuthError = new Error("invalid token");
  const handler = makeHandler();
  const req = makeRequest({ auth: "Bearer bad-token", body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
});

Deno.test("POST com usuário sem role admin retorna 403", async () => {
  resetMocks();
  _mockUser = { id: "user-1", app_metadata: { role: "viewer" } };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
});

Deno.test("POST com usuário sem app_metadata retorna 403", async () => {
  resetMocks();
  _mockUser = { id: "user-1", app_metadata: {} };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 403) throw new Error(`Expected 403, got ${resp.status}`);
});

Deno.test("POST sem email retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const { email: _e, ...noEmail } = VALID_BODY;
  const req = makeRequest({ body: noEmail });
  const resp = await handler(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com email inválido retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = makeRequest({ body: { ...VALID_BODY, email: "nao-e-email" } });
  const resp = await handler(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com senha curta retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = makeRequest({ body: { ...VALID_BODY, senha: "abc" } });
  const resp = await handler(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com corpo > 4 KB retorna 413 antes de parsear (limite durante leitura)", async () => {
  resetMocks();
  const handler = makeHandler();
  const big = "x".repeat(5 * 1024);
  const req = new Request("https://edge.supabase.co/functions/v1/admin-criar-usuario", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer admin-token" },
    body: big,
  });
  const resp = await handler(req);
  if (resp.status !== 413) throw new Error(`Expected 413, got ${resp.status}`);
});

Deno.test("POST com N8N_ADMIN_URL http:// retorna 503", async () => {
  resetMocks();
  _mockN8nUrl = "http://n8n.interno/webhook/criar-usuario";
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
});

Deno.test("POST válido com n8n OK retorna sucesso", async () => {
  resetMocks();
  _mockN8nResponse = { status: 200 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const data = await resp.json();
  if (!data.sucesso) throw new Error("sucesso deveria ser true");
  if (data.mensagem !== "Usuário criado com sucesso.") throw new Error("mensagem inesperada");
});

Deno.test("Resposta de sucesso nunca inclui mensagem interna do n8n", async () => {
  resetMocks();
  _mockN8nResponse = { status: 200 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  const data = await resp.json();
  // Corpo do n8n foi descartado — apenas mensagem hardcoded
  if (data.mensagem !== "Usuário criado com sucesso.") {
    throw new Error(`mensagem de sucesso inesperada: ${data.mensagem}`);
  }
});

Deno.test("Resposta de erro nunca inclui mensagem interna do n8n", async () => {
  resetMocks();
  _mockN8nResponse = { status: 500 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  const data = await resp.json();
  if (data.mensagem !== "Falha ao criar usuário.") {
    throw new Error(`mensagem de erro inesperada: ${data.mensagem}`);
  }
});

Deno.test("Resposta não expõe N8N_ADMIN_SECRET em erro 401 do n8n", async () => {
  resetMocks();
  _mockN8nResponse = { status: 401 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  const text = await resp.text();
  if (text.includes("mock-secret")) throw new Error("N8N_ADMIN_SECRET vazou");
});

Deno.test("Resposta não expõe N8N_ADMIN_URL", async () => {
  resetMocks();
  _mockN8nResponse = { status: 400 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  const text = await resp.text();
  if (text.includes("n8n.default")) throw new Error("N8N_ADMIN_URL vazou");
});

Deno.test("Resposta não contém campos extras além de sucesso e mensagem", async () => {
  resetMocks();
  _mockN8nResponse = { status: 200 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  const data = await resp.json();
  const keys = Object.keys(data);
  if (keys.some((k) => k !== "sucesso" && k !== "mensagem")) {
    throw new Error(`campos extras na resposta: ${keys.join(", ")}`);
  }
});

Deno.test("n8n retornando 422 propaga o status", async () => {
  resetMocks();
  _mockN8nResponse = { status: 422 };
  const handler = makeHandler();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handler(req);
  if (resp.status !== 422) throw new Error(`Expected 422, got ${resp.status}`);
  const data = await resp.json();
  if (data.sucesso !== false) throw new Error("sucesso deveria ser false");
});
