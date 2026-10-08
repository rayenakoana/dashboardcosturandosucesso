/**
 * Edge Function: claude-proxy
 *
 * Autentica o requisitante via Supabase JWT (qualquer usuário autenticado)
 * e encaminha ao endpoint de mensagens da API Anthropic.
 * A chave Anthropic nunca chega ao browser.
 *
 * Proteções:
 *   - JWT verificado pelo runtime Supabase (verify_jwt=true) antes do código
 *     executar, e confirmado com getUser() para validar existência do usuário.
 *   - Corpo lido como bytes — limite real de 64 KB, independente de Content-Length.
 *   - Modelo validado contra lista explícita de modelos permitidos.
 *   - max_tokens capeado em MAX_TOKENS_CAP.
 *   - Somente os campos autorizados de messages e system são encaminhados à Anthropic.
 *   - Rate limiting por usuário via RPC Postgres (opt-in: RATE_LIMIT_ENABLED=true).
 *     RATE_LIMIT_STRICT=true: fail-closed — erros do RPC bloqueiam a chamada.
 *     Padrão: fail-open — erros de infra não geram indisponibilidade.
 *   - Resposta de erro da Anthropic não é repassada verbatim ao frontend.
 *
 * Segredos necessários (supabase secrets set):
 *   ANTHROPIC_KEY         Chave da API Anthropic
 *   RATE_LIMIT_ENABLED    "true" para ativar — requer migração ai_rate_limiting aplicada
 *   RATE_LIMIT_STRICT     "true" para fail-closed no rate limiting
 *
 * Supabase injeta automaticamente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// Limite real lido dos bytes do stream, não do Content-Length (que pode ser forjado).
const BODY_LIMIT_BYTES = 64 * 1024;

// Modelos permitidos — ampliar após avaliação de custo.
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
]);

const MAX_TOKENS_CAP = 2048;

// Máximo de mensagens por requisição (proteção contra payloads excessivos).
const MAX_MESSAGES = 20;

// [F5] Origem permitida — lida do ambiente para permitir configuração por ambiente.
// Se ALLOWED_ORIGIN não estiver definida, mantém "*" (compatível com ambientes locais).
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const CORS = {
  ...CORS_HEADERS,
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS });
  }

  // ── 1. Autenticar via Supabase JWT ────────────────────────────────────────
  // O runtime Supabase já rejeitou tokens com assinatura inválida (verify_jwt=true).
  // getUser() faz segunda verificação contra o servidor: confirma que o usuário
  // ainda existe e lê app_metadata atualizado — tokens de usuários excluídos
  // ou suspensos são rejeitados aqui mesmo que a assinatura seja válida.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Não autenticado." }),
      { status: 401, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido ou expirado." }),
      { status: 401, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // ── 2. Ler e limitar o corpo pelos bytes reais ────────────────────────────
  // Não confiamos em Content-Length: lemos o stream inteiro e verificamos
  // o tamanho antes de parsear.
  let bodyBytes: ArrayBuffer;
  try {
    bodyBytes = await req.arrayBuffer();
  } catch {
    return new Response(
      JSON.stringify({ error: "Erro ao ler corpo da requisição." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  if (bodyBytes.byteLength > BODY_LIMIT_BYTES) {
    return new Response(
      JSON.stringify({ error: "Requisição muito grande." }),
      { status: 413, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new Error("não é objeto");
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição inválido." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // ── 3. Validar modelo e limitar max_tokens ────────────────────────────────
  const requestedModel = typeof body.model === "string" ? body.model : "";
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return new Response(
      JSON.stringify({ error: "Modelo não permitido." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const requestedTokens = typeof body.max_tokens === "number" ? body.max_tokens : MAX_TOKENS_CAP;
  const safeMaxTokens = Math.min(Math.max(1, Math.floor(requestedTokens)), MAX_TOKENS_CAP);

  // ── 4. Validar messages ───────────────────────────────────────────────────
  // [F2/F3] messages deve ser um array não vazio com limite de itens.
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages deve ser um array não vazio." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
  if (body.messages.length > MAX_MESSAGES) {
    return new Response(
      JSON.stringify({ error: "Número de mensagens excede o limite." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // ── 5. Rate limiting por usuário (opt-in) ─────────────────────────────────
  if (Deno.env.get("RATE_LIMIT_ENABLED") === "true") {
    const strict = Deno.env.get("RATE_LIMIT_STRICT") === "true";
    try {
      const { data: rl, error: rlError } = await supabase.rpc("check_and_log_ai_call", {
        p_user_id: user.id,
        p_model: requestedModel,
      });

      if (rlError) {
        console.error("[claude-proxy] rate limit RPC error:", rlError.message);
        if (strict) {
          return new Response(
            JSON.stringify({ error: "Serviço temporariamente indisponível." }),
            { status: 503, headers: { ...CORS, "Content-Type": "application/json" } },
          );
        }
      } else if (rl && !rl.allowed) {
        return new Response(
          JSON.stringify({ error: "Limite de chamadas atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }
    } catch (rlEx) {
      console.error("[claude-proxy] rate limit check threw:", (rlEx as Error).message);
      if (strict) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível." }),
          { status: 503, headers: { ...CORS, "Content-Type": "application/json" } },
        );
      }
    }
  }

  // ── 6. Construir payload com allowlist de campos ──────────────────────────
  // [F1] Somente campos explicitamente autorizados são encaminhados à Anthropic.
  // Campos como stream, metadata, tool_choice, stop_sequences, etc., são ignorados.
  const anthropicBody: Record<string, unknown> = {
    model: requestedModel,
    max_tokens: safeMaxTokens,
    messages: body.messages,
  };

  // system é opcional — incluir somente se for string não vazia.
  if (typeof body.system === "string" && body.system.length > 0) {
    anthropicBody.system = body.system;
  }

  // ── 7. Obter chave Anthropic ──────────────────────────────────────────────
  // [F4] A chave nunca aparece em respostas nem em logs de erro ao frontend.
  const anthropicKey = Deno.env.get("ANTHROPIC_KEY");
  if (!anthropicKey) {
    // Log interno: útil para diagnóstico. Não expõe o valor.
    console.error("[claude-proxy] ANTHROPIC_KEY não configurada.");
    return new Response(
      JSON.stringify({ error: "Serviço indisponível." }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // ── 8. Encaminhar à Anthropic ─────────────────────────────────────────────
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(anthropicBody),
    });
  } catch (err) {
    console.error("[claude-proxy] Falha ao contatar Anthropic:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Erro de conexão com o serviço de IA." }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // [F4] Em erros da Anthropic, não repassa o corpo verbatim (pode conter
  // informações internas). Repassa somente o status e uma mensagem genérica,
  // exceto para 200 onde o frontend precisa do payload completo.
  if (!anthropicRes.ok) {
    console.error("[claude-proxy] Anthropic retornou status:", anthropicRes.status);
    return new Response(
      JSON.stringify({ error: "Erro no serviço de IA.", status: anthropicRes.status }),
      { status: anthropicRes.status, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const data = await anthropicRes.json().catch(() => ({}));
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
