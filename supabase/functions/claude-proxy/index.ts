/**
 * Edge Function: claude-proxy
 *
 * Autentica o requisitante via Supabase JWT (qualquer usuário autenticado)
 * e encaminha ao endpoint de mensagens da API Anthropic.
 * A chave Anthropic nunca chega ao browser.
 *
 * Proteções de consumo:
 *   - Apenas usuários com JWT válido e ativo são aceitos.
 *   - Modelo fixado em lista segura; payloads que tentam usar outros modelos
 *     são rejeitados (evita uso de modelos mais caros).
 *   - max_tokens limitado a MAX_TOKENS_CAP (evita respostas longas não previstas).
 *   - Corpo da requisição limitado a 64 KB.
 *
 * Segredos necessários (supabase secrets set):
 *   ANTHROPIC_KEY  Chave da API Anthropic
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

// Modelos permitidos — ampliar conforme necessário após avaliação de custo.
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

  // getUser valida o token contra o servidor Supabase — não apenas decodifica
  // localmente. Tokens revogados ou expirados são rejeitados aqui.
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Token inválido ou expirado." }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 2. Validar e limitar o corpo ──────────────────────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 64 * 1024) {
    return new Response(
      JSON.stringify({ error: "Requisição muito grande." }),
      { status: 413, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
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

  // Limita max_tokens mesmo que o frontend envie um valor maior.
  const requestedTokens = Number(body.max_tokens ?? MAX_TOKENS_CAP);
  const safeMaxTokens = Math.min(requestedTokens, MAX_TOKENS_CAP);

  const anthropicKey = Deno.env.get("ANTHROPIC_KEY");
  if (!anthropicKey) {
    console.error("[claude-proxy] ANTHROPIC_KEY não configurada.");
    return new Response(
      JSON.stringify({ error: "Serviço indisponível." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 4. Encaminhar à Anthropic ─────────────────────────────────────────────
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
