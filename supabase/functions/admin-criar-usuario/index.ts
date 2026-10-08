/**
 * Edge Function: admin-criar-usuario
 *
 * Autentica o requisitante via Supabase JWT, verifica se possui
 * app_metadata.role === "admin", e encaminha ao webhook n8n.
 *
 * Segredos necessários (supabase secrets set):
 *   N8N_ADMIN_URL     URL completa do webhook n8n
 *   N8N_ADMIN_SECRET  Segredo compartilhado com o n8n
 *
 * Supabase injeta automaticamente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  // ── 1. Extrair e verificar token ──────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Não autenticado." }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.slice(7);

  // Usa service role para chamar getUser — valida o JWT contra o servidor
  // (não apenas decodifica localmente).
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Token inválido ou expirado." }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 2. Verificar permissão administrativa ─────────────────────────────────
  // app_metadata é definido apenas via API de serviço — não pode ser alterado
  // pelo próprio usuário. Fonte confiável de roles.
  if (user.app_metadata?.role !== "admin") {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Acesso restrito a administradores." }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 3. Validar corpo da requisição ────────────────────────────────────────
  let body: { email?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Corpo da requisição inválido." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (!body.email || !body.senha) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "email e senha são obrigatórios." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 4. Encaminhar ao n8n ──────────────────────────────────────────────────
  const n8nUrl = Deno.env.get("N8N_ADMIN_URL");
  const n8nSecret = Deno.env.get("N8N_ADMIN_SECRET");

  if (!n8nUrl || !n8nSecret) {
    // Não expor valores ausentes nos logs de produção — apenas indicar o problema.
    console.error("[admin-criar-usuario] Variáveis de ambiente N8N não configuradas.");
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Serviço indisponível." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let n8nRes: Response;
  try {
    n8nRes = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": n8nSecret,
      },
      body: JSON.stringify({ email: body.email, senha: body.senha }),
    });
  } catch (err) {
    console.error("[admin-criar-usuario] Falha ao contatar n8n:", (err as Error).message);
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Erro de conexão com o serviço de cadastro." }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const data = await n8nRes.json().catch(() => ({}));
  return new Response(JSON.stringify(data), {
    status: n8nRes.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
