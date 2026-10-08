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
 *   - Rate limiting por usuário via RPC Postgres (opt-in: RATE_LIMIT_ENABLED=true).
 *     Se a tabela não existir ou o RPC falhar, a chamada prossegue (fail-open
 *     intencional para evitar indisponibilidade por causa de infra de métricas).
 *
 * Segredos necessários (supabase secrets set):
 *   ANTHROPIC_KEY         Chave da API Anthropic
 *   RATE_LIMIT_ENABLED    "true" para ativar — requer migração aplicada no banco
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

const BODY_LIMIT_BYTES = 64 * 1024; // 64 KB — lido dos bytes reais, não do header

// Modelos permitidos — ampliar após avaliação de custo.
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
]);

const MAX_TOKENS_CAP = 2048;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  // ── 1. Autenticar via Supabase JWT ────────────────────────────────────────
  // O runtime Supabase já rejeitou tokens com assinatura inválida (verify_jwt=true).
  // getUser() faz uma segunda verificação contra o servidor: confirma que o usuário
  // ainda existe e lê app_metadata atualizado — tokens de usuários excluídos
  // ou suspensos são rejeitados aqui mesmo que a assinatura seja válida.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Não autenticado." }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
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
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 2. Ler e limitar o corpo pelos bytes reais ────────────────────────────
  // Não confiamos em Content-Length: o valor pode estar ausente, incorreto ou
  // ser omitido intencionalmente por um cliente mal-formado. Lemos o stream
  // inteiro e verificamos o tamanho antes de parsear.
  let bodyBytes: ArrayBuffer;
  try {
    bodyBytes = await req.arrayBuffer();
  } catch {
    return new Response(
      JSON.stringify({ error: "Erro ao ler corpo da requisição." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (bodyBytes.byteLength > BODY_LIMIT_BYTES) {
    return new Response(
      JSON.stringify({ error: "Requisição muito grande." }),
      { status: 413, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return new Response(
      JSON.stringify({ error: "Corpo da requisição inválido." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 3. Validar modelo e limitar max_tokens ────────────────────────────────
  const requestedModel = String(body.model ?? "");
  if (!ALLOWED_MODELS.has(requestedModel)) {
    return new Response(
      JSON.stringify({ error: "Modelo não permitido." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const requestedTokens = Number(body.max_tokens ?? MAX_TOKENS_CAP);
  const safeMaxTokens = Math.min(requestedTokens, MAX_TOKENS_CAP);

  // ── 4. Rate limiting por usuário (opt-in) ─────────────────────────────────
  // Ativo apenas quando RATE_LIMIT_ENABLED=true E a migração foi aplicada.
  // Fail-open: se o RPC falhar (tabela ausente, timeout), a chamada prossegue.
  if (Deno.env.get("RATE_LIMIT_ENABLED") === "true") {
    try {
      const { data: rl, error: rlError } = await supabase.rpc("check_and_log_ai_call", {
        p_user_id: user.id,
        p_model: requestedModel,
      });

      if (rlError) {
        // Log para depuração mas não bloqueia — evita indisponibilidade por
        // falha de infra de métricas.
        console.error("[claude-proxy] rate limit RPC error:", rlError.message);
      } else if (rl && !rl.allowed) {
        return new Response(
          JSON.stringify({ error: "Limite de chamadas atingido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
    } catch (rlEx) {
      console.error("[claude-proxy] rate limit check threw:", (rlEx as Error).message);
    }
  }

  // ── 5. Encaminhar à Anthropic ─────────────────────────────────────────────
  const anthropicKey = Deno.env.get("ANTHROPIC_KEY");
  if (!anthropicKey) {
    console.error("[claude-proxy] ANTHROPIC_KEY não configurada.");
    return new Response(
      JSON.stringify({ error: "Serviço indisponível." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const anthropicBody = { ...body, max_tokens: safeMaxTokens };

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
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const data = await anthropicRes.json().catch(() => ({}));
  return new Response(JSON.stringify(data), {
    status: anthropicRes.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
