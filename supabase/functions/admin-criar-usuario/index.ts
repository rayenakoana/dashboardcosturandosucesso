/**
 * Edge Function: admin-criar-usuario
 *
 * Autentica o requisitante via Supabase JWT, verifica se possui
 * app_metadata.role === "admin", valida os dados e encaminha ao webhook n8n.
 *
 * Proteções:
 *   - JWT verificado pelo runtime (verify_jwt=true) + getUser() server-side.
 *   - Autorização por app_metadata.role === "admin" (não alterável pelo usuário).
 *   - Corpo limitado a BODY_LIMIT_BYTES antes de parsear.
 *   - Validação de tipo, formato de email e comprimento mínimo de senha.
 *   - N8N_ADMIN_URL deve usar HTTPS — URLs HTTP são rejeitadas.
 *   - Timeout no fetch ao n8n (N8N_TIMEOUT_MS, padrão 10s).
 *   - Resposta do n8n não é repassada verbatim — apenas sucesso/mensagem seguros.
 *
 * Segredos necessários (supabase secrets set):
 *   N8N_ADMIN_URL     URL HTTPS completa do webhook n8n
 *   N8N_ADMIN_SECRET  Segredo compartilhado com o n8n (cabeçalho X-Admin-Secret)
 *
 * Supabase injeta automaticamente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// [F6] Limite de corpo — lido dos bytes reais, não do Content-Length.
const BODY_LIMIT_BYTES = 4 * 1024; // 4 KB é suficiente para email + senha

// [F8] Tamanho mínimo da senha.
const SENHA_MIN_LENGTH = 8;

// [F11] Timeout do fetch ao n8n (ms). Configurável via N8N_TIMEOUT_MS.
const N8N_TIMEOUT_MS = parseInt(Deno.env.get("N8N_TIMEOUT_MS") ?? "10000", 10);

// [F7] Regex de validação de email — cobertura básica suficiente para server-side.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  // (não apenas decodifica localmente). Tokens de usuários suspensos ou
  // excluídos são rejeitados mesmo que a assinatura seja válida.
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

  // ── 3. Ler e limitar o corpo ──────────────────────────────────────────────
  // [F6] Lê bytes reais antes de parsear — previne DoS com body ilimitado.
  let bodyBytes: ArrayBuffer;
  try {
    bodyBytes = await req.arrayBuffer();
  } catch {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Erro ao ler corpo da requisição." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  if (bodyBytes.byteLength > BODY_LIMIT_BYTES) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Requisição muito grande." }),
      { status: 413, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
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
      JSON.stringify({ sucesso: false, mensagem: "Corpo da requisição inválido." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 4. Validar campos obrigatórios ────────────────────────────────────────
  // [F7] email: tipo string + formato básico.
  const email = body.email;
  if (typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 254) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Email inválido." }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // [F8] senha: tipo string + comprimento mínimo.
  const senha = body.senha;
  if (typeof senha !== "string" || senha.length < SENHA_MIN_LENGTH) {
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: `Senha deve ter ao menos ${SENHA_MIN_LENGTH} caracteres.` }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 5. Verificar configuração do n8n ─────────────────────────────────────
  const n8nUrl = Deno.env.get("N8N_ADMIN_URL");
  const n8nSecret = Deno.env.get("N8N_ADMIN_SECRET");

  if (!n8nUrl || !n8nSecret) {
    console.error("[admin-criar-usuario] N8N_ADMIN_URL ou N8N_ADMIN_SECRET não configurados.");
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Serviço indisponível." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // [F9] Rejeitar URLs que não usam HTTPS — previne envio de credenciais em claro.
  if (!n8nUrl.startsWith("https://")) {
    console.error("[admin-criar-usuario] N8N_ADMIN_URL não usa HTTPS.");
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: "Configuração inválida do serviço." }),
      { status: 503, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  // ── 6. Encaminhar ao n8n com timeout ─────────────────────────────────────
  // [F11] AbortController garante que o fetch não fique pendente indefinidamente.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);

  let n8nRes: Response;
  try {
    n8nRes = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": n8nSecret,
      },
      // Envia somente os campos validados — não propaga o body bruto.
      body: JSON.stringify({ email, senha }),
      signal: controller.signal,
    });
  } catch (err) {
    const msg = (err as Error).name === "AbortError"
      ? "Timeout ao contatar serviço de cadastro."
      : "Erro de conexão com o serviço de cadastro.";
    console.error("[admin-criar-usuario] fetch n8n falhou:", (err as Error).message);
    return new Response(
      JSON.stringify({ sucesso: false, mensagem: msg }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // [F10] Não repassa a resposta bruta do n8n ao frontend.
  // Extrai somente os campos esperados; defaults seguros se ausentes.
  let n8nData: Record<string, unknown> = {};
  try {
    n8nData = await n8nRes.json();
  } catch {
    // Resposta do n8n não era JSON — trata como falha genérica.
  }

  const sucesso = n8nRes.ok && n8nData.sucesso !== false;
  const mensagem = sucesso
    ? (typeof n8nData.mensagem === "string" ? n8nData.mensagem : "Usuário criado com sucesso.")
    : (typeof n8nData.mensagem === "string" ? n8nData.mensagem : "Falha ao criar usuário.");

  return new Response(
    JSON.stringify({ sucesso, mensagem }),
    {
      status: sucesso ? 200 : (n8nRes.status >= 400 ? n8nRes.status : 500),
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
