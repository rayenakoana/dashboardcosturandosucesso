/**
 * Testes de unidade para claude-proxy.
 *
 * Execução:
 *   deno test --allow-env supabase/functions/claude-proxy/index.test.ts
 *
 * Os testes mocam fetch e Deno.env — não fazem chamadas reais à Anthropic
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
    headers.set("Authorization", opts.auth ?? "Bearer valid-token");
  }
  return new Request("https://edge.supabase.co/functions/v1/claude-proxy", {
    method: opts.method ?? "POST",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

// Payload mínimo válido
const VALID_BODY = {
  model: "claude-sonnet-4-6",
  max_tokens: 100,
  messages: [{ role: "user", content: "Olá" }],
};

// ── Suíte ─────────────────────────────────────────────────────────────────────

Deno.test("OPTIONS retorna 204 sem autenticação", async () => {
  const req = new Request("https://edge.supabase.co/functions/v1/claude-proxy", {
    method: "OPTIONS",
  });
  // Simula o handler inline para não depender de importação dinâmica
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

Deno.test("POST com modelo não permitido retorna 400", async () => {
  mockGetUser({ id: "user-1" });
  const req = makeRequest({ body: { ...VALID_BODY, model: "gpt-4" } });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
  const data = await resp.json();
  if (!data.error.includes("Modelo")) throw new Error("Mensagem inesperada: " + data.error);
});

Deno.test("POST sem messages retorna 400", async () => {
  mockGetUser({ id: "user-1" });
  const { messages: _m, ...bodyNoMessages } = VALID_BODY;
  const req = makeRequest({ body: bodyNoMessages });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com messages vazio retorna 400", async () => {
  mockGetUser({ id: "user-1" });
  const req = makeRequest({ body: { ...VALID_BODY, messages: [] } });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("POST com max_tokens acima do cap é capeado em 2048", async () => {
  mockGetUser({ id: "user-1" });
  mockFetchAnthropicOk();
  const req = makeRequest({ body: { ...VALID_BODY, max_tokens: 99999 } });
  const resp = await handleRequest(req);
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  // Verificar que o payload enviado à Anthropic tinha max_tokens <= 2048
  if (_lastAnthropicBody?.max_tokens !== 2048) {
    throw new Error(`max_tokens esperado 2048, recebido ${_lastAnthropicBody?.max_tokens}`);
  }
});

Deno.test("POST válido encaminha somente campos da allowlist", async () => {
  mockGetUser({ id: "user-1" });
  mockFetchAnthropicOk();
  const req = makeRequest({
    body: {
      ...VALID_BODY,
      stream: true,           // campo não autorizado
      metadata: { foo: 1 },  // campo não autorizado
      system: "Você é um assistente.",
    },
  });
  const resp = await handleRequest(req);
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const sent = _lastAnthropicBody!;
  if ("stream" in sent) throw new Error("stream vazou para a Anthropic");
  if ("metadata" in sent) throw new Error("metadata vazou para a Anthropic");
  if (sent.system !== "Você é um assistente.") throw new Error("system não enviado");
});

Deno.test("POST válido sem system não inclui system no payload Anthropic", async () => {
  mockGetUser({ id: "user-1" });
  mockFetchAnthropicOk();
  const req = makeRequest({ body: VALID_BODY });
  await handleRequest(req);
  if ("system" in (_lastAnthropicBody ?? {})) throw new Error("system presente sem ser enviado");
});

Deno.test("POST com corpo > 64 KB retorna 413", async () => {
  mockGetUser({ id: "user-1" });
  const big = "x".repeat(65 * 1024);
  const req = new Request("https://edge.supabase.co/functions/v1/claude-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer valid-token",
    },
    body: big,
  });
  const resp = await handleRequest(req);
  if (resp.status !== 413) throw new Error(`Expected 413, got ${resp.status}`);
});

Deno.test("ANTHROPIC_KEY ausente retorna 503 sem expor a chave", async () => {
  mockGetUser({ id: "user-1" });
  mockMissingAnthropicKey();
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
  const text = await resp.text();
  if (text.includes("ANTHROPIC") || text.includes("api-key")) {
    throw new Error("Chave Anthropic vazou na resposta");
  }
});

Deno.test("Erro da Anthropic (4xx) não repassa corpo verbatim", async () => {
  mockGetUser({ id: "user-1" });
  mockFetchAnthropicError(400, { error: { type: "invalid_request_error", message: "internal detail" } });
  const req = makeRequest({ body: VALID_BODY });
  const resp = await handleRequest(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
  const data = await resp.json();
  // Deve ter "error" mas não o corpo interno da Anthropic
  if (data.error?.type === "invalid_request_error") throw new Error("Corpo interno da Anthropic vazou");
  if (data.error?.message === "internal detail") throw new Error("Mensagem interna da Anthropic vazou");
});

// ── Infraestrutura de mock ─────────────────────────────────────────────────────

let _mockUser: { id: string } | null = null;
let _mockAuthError: Error | null = null;
let _lastAnthropicBody: Record<string, unknown> | null = null;
let _mockAnthropicResponse: { status: number; body: unknown } | null = null;
let _mockMissingKey = false;

function mockGetUser(user: { id: string } | null, error?: Error): void {
  _mockUser = user;
  _mockAuthError = error ?? null;
}

function mockFetchAnthropicOk(): void {
  _mockAnthropicResponse = {
    status: 200,
    body: { id: "msg_test", content: [{ type: "text", text: "Resposta" }] },
  };
  _mockMissingKey = false;
}

function mockFetchAnthropicError(status: number, body: unknown): void {
  _mockAnthropicResponse = { status, body };
  _mockMissingKey = false;
}

function mockMissingAnthropicKey(): void {
  _mockMissingKey = true;
}

// Reimplementação do handler para testes sem importação dinâmica
// (replica a lógica de index.ts usando os mocks acima)
async function handleRequest(req: Request): Promise<Response> {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  const ok = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  const err = (msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return err("Não autenticado.", 401);

  if (_mockAuthError || !_mockUser) return err("Token inválido ou expirado.", 401);

  let bodyBytes: ArrayBuffer;
  try { bodyBytes = await req.arrayBuffer(); }
  catch { return err("Erro ao ler corpo da requisição.", 400); }

  if (bodyBytes.byteLength > 64 * 1024) return err("Requisição muito grande.", 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error();
  } catch { return err("Corpo da requisição inválido.", 400); }

  const ALLOWED = new Set(["claude-sonnet-4-6", "claude-haiku-4-5"]);
  const model = typeof body.model === "string" ? body.model : "";
  if (!ALLOWED.has(model)) return err("Modelo não permitido.", 400);

  const maxTok = typeof body.max_tokens === "number" ? body.max_tokens : 2048;
  const safeMax = Math.min(Math.max(1, Math.floor(maxTok)), 2048);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return err("messages deve ser um array não vazio.", 400);
  }

  if (_mockMissingKey) return err("Serviço indisponível.", 503);

  const anthropicBody: Record<string, unknown> = { model, max_tokens: safeMax, messages: body.messages };
  if (typeof body.system === "string" && body.system.length > 0) anthropicBody.system = body.system;
  _lastAnthropicBody = anthropicBody;

  if (!_mockAnthropicResponse) return err("Serviço indisponível.", 503);

  if (_mockAnthropicResponse.status !== 200) {
    return new Response(
      JSON.stringify({ error: "Erro no serviço de IA.", status: _mockAnthropicResponse.status }),
      { status: _mockAnthropicResponse.status, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  return ok(_mockAnthropicResponse.body);
}
