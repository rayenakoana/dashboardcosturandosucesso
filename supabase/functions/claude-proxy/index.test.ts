/**
 * Testes de unidade para claude-proxy.
 *
 * Execução:
 *   deno test --allow-env supabase/functions/claude-proxy/index.test.ts
 *
 * Importa o handler real de handler.ts com dependências mockadas.
 * Nenhuma chamada real à Anthropic ou ao Supabase é feita.
 */

import { createHandler, HandlerDeps } from "./handler.ts";

// ── Infraestrutura de mock ─────────────────────────────────────────────────────

type MockUser = { id: string } | null;
interface MockRlResult { data: { allowed: boolean } | null; error: Error | null }
interface MockAnthropicResponse { status: number; body?: unknown }

let _mockUser: MockUser = null;
let _mockAuthError: Error | null = null;
let _mockAuthThrows = false;
let _mockRl: MockRlResult = { data: { allowed: true }, error: null };
let _mockRlThrows = false;
let _mockAnthropicResponse: MockAnthropicResponse | null = null;
let _mockEnv: Record<string, string> = {};
let _lastAnthropicPayload: unknown = null;
let _anthropicCallCount = 0;

function resetMocks(): void {
  _mockUser = { id: "user-1" };
  _mockAuthError = null;
  _mockAuthThrows = false;
  _mockRl = { data: { allowed: true }, error: null };
  _mockRlThrows = false;
  _mockAnthropicResponse = {
    status: 200,
    body: { id: "msg_test", content: [{ type: "text", text: "Resposta" }] },
  };
  _mockEnv = {
    ANTHROPIC_KEY: "test-key",
    ALLOWED_ORIGIN: "*",
  };
  _lastAnthropicPayload = null;
  _anthropicCallCount = 0;
}

function makeHandler() {
  const deps: HandlerDeps = {
    getEnv: (key) => _mockEnv[key],

    getUser: async (_token) => {
      if (_mockAuthThrows) throw new Error("network error");
      return { user: _mockUser, error: _mockAuthError };
    },

    rpcRateLimit: async (_userId, _model) => {
      if (_mockRlThrows) throw new Error("rpc network error");
      return _mockRl;
    },

    fetchAnthropic: async (payload, _key) => {
      _anthropicCallCount++;
      _lastAnthropicPayload = payload;
      if (!_mockAnthropicResponse) throw new Error("no mock anthropic response");
      const { status, body } = _mockAnthropicResponse;
      return new Response(
        body !== undefined ? JSON.stringify(body) : "",
        { status },
      );
    },
  };
  return createHandler(deps);
}

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

const VALID_BODY = {
  model: "claude-sonnet-5-5",
  max_tokens: 100,
  messages: [{ role: "user", content: "Olá" }],
};

// ── Testes ────────────────────────────────────────────────────────────────────

Deno.test("OPTIONS retorna 204 sem autenticação", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = new Request("https://edge.supabase.co/functions/v1/claude-proxy", { method: "OPTIONS" });
  const resp = await handler(req);
  if (resp.status !== 204) throw new Error(`Expected 204, got ${resp.status}`);
});

Deno.test("GET retorna 405", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ method: "GET" }));
  if (resp.status !== 405) throw new Error(`Expected 405, got ${resp.status}`);
});

Deno.test("POST sem Authorization retorna 401", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ auth: null, body: VALID_BODY }));
  if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
});

Deno.test("POST sem Authorization não chama Anthropic", async () => {
  resetMocks();
  const handler = makeHandler();
  await handler(makeRequest({ auth: null, body: VALID_BODY }));
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada sem autenticação");
});

Deno.test("POST com token inválido retorna 401", async () => {
  resetMocks();
  _mockUser = null;
  _mockAuthError = new Error("invalid token");
  const handler = makeHandler();
  const resp = await handler(makeRequest({ auth: "Bearer bad", body: VALID_BODY }));
  if (resp.status !== 401) throw new Error(`Expected 401, got ${resp.status}`);
});

Deno.test("POST com token inválido não chama Anthropic", async () => {
  resetMocks();
  _mockUser = null;
  _mockAuthError = new Error("invalid");
  const handler = makeHandler();
  await handler(makeRequest({ auth: "Bearer bad", body: VALID_BODY }));
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada com token inválido");
});

Deno.test("getUser lançando exceção retorna 503", async () => {
  resetMocks();
  _mockAuthThrows = true;
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
});

Deno.test("getUser lançando exceção não chama Anthropic", async () => {
  resetMocks();
  _mockAuthThrows = true;
  const handler = makeHandler();
  await handler(makeRequest({ body: VALID_BODY }));
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada após falha de infra em getUser");
});

Deno.test("Corpo > 64 KB retorna 413", async () => {
  resetMocks();
  const handler = makeHandler();
  const big = "x".repeat(65 * 1024);
  const req = new Request("https://edge.supabase.co/functions/v1/claude-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer valid-token" },
    body: big,
  });
  const resp = await handler(req);
  if (resp.status !== 413) throw new Error(`Expected 413, got ${resp.status}`);
});

Deno.test("Corpo inválido retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const req = new Request("https://edge.supabase.co/functions/v1/claude-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer valid-token" },
    body: "not json",
  });
  const resp = await handler(req);
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("Modelo não permitido retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, model: "gpt-4" } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
  const data = await resp.json();
  if (!data.error.includes("Modelo")) throw new Error("Mensagem inesperada: " + data.error);
});

Deno.test("max_tokens como string retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, max_tokens: "100" } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("max_tokens null retorna 400 (NaN e Infinity serializam como null em JSON)", async () => {
  resetMocks();
  const handler = makeHandler();
  // JSON.stringify(NaN) e JSON.stringify(Infinity) produzem "null".
  // Testamos null diretamente, que cobre esses dois casos.
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, max_tokens: null } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("max_tokens booleano retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, max_tokens: true } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("max_tokens negativo retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, max_tokens: -1 } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("max_tokens decimal retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, max_tokens: 1.5 } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("max_tokens acima do cap é capeado em 2048", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, max_tokens: 99999 } }));
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const sent = _lastAnthropicPayload as Record<string, unknown>;
  if (sent.max_tokens !== 2048) throw new Error(`max_tokens esperado 2048, recebido ${sent.max_tokens}`);
});

Deno.test("max_tokens ausente usa o cap padrão", async () => {
  resetMocks();
  const handler = makeHandler();
  const { max_tokens: _mt, ...bodyNoMax } = VALID_BODY;
  const resp = await handler(makeRequest({ body: bodyNoMax }));
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const sent = _lastAnthropicPayload as Record<string, unknown>;
  if (sent.max_tokens !== 2048) throw new Error(`max_tokens esperado 2048, recebido ${sent.max_tokens}`);
});

Deno.test("messages ausente retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const { messages: _m, ...bodyNoMsg } = VALID_BODY;
  const resp = await handler(makeRequest({ body: bodyNoMsg }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("messages vazio retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, messages: [] } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("messages com 21 itens retorna 400", async () => {
  resetMocks();
  const handler = makeHandler();
  const msgs = Array.from({ length: 21 }, (_, i) => ({ role: "user", content: `msg ${i}` }));
  const resp = await handler(makeRequest({ body: { ...VALID_BODY, messages: msgs } }));
  if (resp.status !== 400) throw new Error(`Expected 400, got ${resp.status}`);
});

Deno.test("Rate limit RPC retorna erro bloqueia Anthropic e retorna 503", async () => {
  resetMocks();
  _mockRl = { data: null, error: new Error("rpc error") };
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada com rate limit RPC em erro");
});

Deno.test("Rate limit RPC lança exceção bloqueia Anthropic e retorna 503", async () => {
  resetMocks();
  _mockRlThrows = true;
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada com exceção no rate limit");
});

Deno.test("Rate limit RPC retorna null bloqueia Anthropic e retorna 503", async () => {
  resetMocks();
  _mockRl = { data: null, error: null };
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada com rate limit null");
});

Deno.test("Rate limit allowed:false retorna 429 sem chamar Anthropic", async () => {
  resetMocks();
  _mockRl = { data: { allowed: false }, error: null };
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 429) throw new Error(`Expected 429, got ${resp.status}`);
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada com rate limit excedido");
});

Deno.test("ANTHROPIC_KEY ausente retorna 503 sem expor a chave", async () => {
  resetMocks();
  delete _mockEnv["ANTHROPIC_KEY"];
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
  const text = await resp.text();
  if (text.includes("ANTHROPIC") || text.includes("api-key")) {
    throw new Error("Chave Anthropic vazou na resposta");
  }
});

Deno.test("Payload enviado à Anthropic respeita a allowlist", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({
    body: {
      ...VALID_BODY,
      stream: true,
      metadata: { foo: 1 },
      system: "Você é um assistente.",
    },
  }));
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const sent = _lastAnthropicPayload as Record<string, unknown>;
  if ("stream" in sent) throw new Error("stream vazou para a Anthropic");
  if ("metadata" in sent) throw new Error("metadata vazou para a Anthropic");
  if (sent.system !== "Você é um assistente.") throw new Error("system não enviado");
});

Deno.test("system ausente não inclui system no payload Anthropic", async () => {
  resetMocks();
  const handler = makeHandler();
  await handler(makeRequest({ body: VALID_BODY }));
  if ("system" in ((_lastAnthropicPayload as Record<string, unknown>) ?? {})) {
    throw new Error("system presente sem ser enviado");
  }
});

Deno.test("Erro Anthropic não repassa status interno ao frontend", async () => {
  resetMocks();
  _mockAnthropicResponse = { status: 400, body: { error: { type: "invalid_request_error", message: "internal detail" } } };
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 502) throw new Error(`Expected 502, got ${resp.status}`);
  const data = await resp.json();
  if (data.error?.type === "invalid_request_error") throw new Error("Corpo interno da Anthropic vazou");
  if (data.error?.message === "internal detail") throw new Error("Mensagem interna da Anthropic vazou");
  // Não deve ter campo "status" com o código interno
  if ("status" in data) throw new Error("status interno da Anthropic vazou no JSON");
});

Deno.test("Resposta Anthropic 200 preserva contrato de sucesso ao frontend", async () => {
  resetMocks();
  const handler = makeHandler();
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 200) throw new Error(`Expected 200, got ${resp.status}`);
  const data = await resp.json();
  if (data.id !== "msg_test") throw new Error("Contrato de sucesso quebrado: id ausente");
  if (!Array.isArray(data.content)) throw new Error("Contrato de sucesso quebrado: content ausente");
});

Deno.test("Anthropic 200 com corpo não-JSON retorna 502", async () => {
  resetMocks();
  const handler = createHandler({
    getEnv: (key) => _mockEnv[key],
    getUser: async (_t) => ({ user: _mockUser, error: null }),
    rpcRateLimit: async (_u, _m) => _mockRl,
    fetchAnthropic: async (_p, _k) => {
      return new Response("não é json válido <!DOCTYPE html>", { status: 200 });
    },
  });
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 502) throw new Error(`Expected 502, got ${resp.status}`);
});

Deno.test("Rate limit allowed como string não-booleana bloqueia Anthropic e retorna 503", async () => {
  resetMocks();
  const handler = createHandler({
    getEnv: (key) => _mockEnv[key],
    getUser: async (_t) => ({ user: _mockUser, error: null }),
    // Retorna { allowed: "yes" } — tipo inválido segundo o contrato
    rpcRateLimit: async (_u, _m) => ({ data: { allowed: "yes" } as unknown as { allowed: boolean }, error: null }),
    fetchAnthropic: async (_p, _k) => {
      _anthropicCallCount++;
      return new Response("{}", { status: 200 });
    },
  });
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 503) throw new Error(`Expected 503, got ${resp.status}`);
  if (_anthropicCallCount !== 0) throw new Error("Anthropic foi chamada com allowed não-booleano");
});

Deno.test("Resposta Anthropic > 256 KB retorna 502", async () => {
  resetMocks();
  // Cria um body grande suficiente para exceder o limite de leitura
  _mockAnthropicResponse = {
    status: 200,
    body: undefined,
  };
  // Substitui fetchAnthropic para retornar stream grande diretamente
  const bigBody = "x".repeat(257 * 1024);
  const handler = createHandler({
    getEnv: (key) => _mockEnv[key],
    getUser: async (_t) => ({ user: _mockUser, error: null }),
    rpcRateLimit: async (_u, _m) => _mockRl,
    fetchAnthropic: async (_p, _k) => {
      return new Response(bigBody, { status: 200 });
    },
  });
  const resp = await handler(makeRequest({ body: VALID_BODY }));
  if (resp.status !== 502) throw new Error(`Expected 502, got ${resp.status}`);
});

Deno.test("Erro Anthropic não registra mensagens sensíveis nos logs", async () => {
  resetMocks();
  const secret = "SEGREDO_TESTE_NAO_REGISTRAR";
  _mockAnthropicResponse = {
    status: 400,
    body: {
      error: {
        type: "invalid_request_error",
        message: secret,
      },
    },
  };

  const logs: string[] = [];
  const originalError = console.error;

  console.error = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  try {
    const resp = await makeHandler()(makeRequest({ body: VALID_BODY }));
    if (resp.status !== 502) {
      throw new Error(`Esperado 502, recebido ${resp.status}`);
    }

    const responseText = await resp.text();
    if (responseText.includes(secret)) {
      throw new Error("Informação sensível apareceu na resposta");
    }

    const logText = logs.join("\n");
    if (logText.includes(secret)) {
      throw new Error("Informação sensível apareceu nos logs");
    }
    if (!logText.includes("invalid_request_error")) {
      throw new Error("Tipo de erro não foi registrado");
    }
  } finally {
    console.error = originalError;
  }
});
