/**
 * Edge Function: admin-criar-usuario
 *
 * Autentica o requisitante via Supabase JWT, verifica se possui
 * app_metadata.role === "admin" e encaminha ao webhook n8n.
 * Toda a lógica vive em handler.ts com deps injetáveis.
 *
 * Segredos necessários (supabase secrets set):
 *   N8N_ADMIN_URL     URL HTTPS completa do webhook n8n
 *   N8N_ADMIN_SECRET  Segredo compartilhado com o n8n (cabeçalho X-Admin-Secret)
 *
 * Supabase injeta automaticamente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "./handler.ts";

function getValidTimeout(raw: string | undefined, fallback = 10_000): number {
  const parsed = parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const N8N_TIMEOUT_MS = getValidTimeout(Deno.env.get("N8N_TIMEOUT_MS"));

const handler = createHandler({
  getEnv: (key) => Deno.env.get(key),

  getUser: async (token) => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user: user ?? null, error: error ?? null };
  },

  fetchN8n: async (url, secret, email, senha) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Secret": secret },
        body: JSON.stringify({ email, senha }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },
});

Deno.serve(handler);
