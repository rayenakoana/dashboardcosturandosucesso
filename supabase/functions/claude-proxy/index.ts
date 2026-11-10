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
 *   - Corpo lido incrementalmente — limite real de 64 KB durante o streaming.
 *   - Modelo validado contra lista explícita de modelos permitidos.
 *   - max_tokens validado (inteiro positivo) e capeado em MAX_TOKENS_CAP.
 *   - Somente os campos autorizados de messages e system são encaminhados à Anthropic.
 *   - Rate limiting por usuário via RPC Postgres — OBRIGATÓRIO (fail-closed).
 *     A RPC check_and_log_ai_call deve retornar { allowed: true }; qualquer
 *     falha de infra ou resultado inválido bloqueia a chamada.
 *   - Resposta de erro da Anthropic não é repassada verbatim ao frontend.
 *
 * Segredos necessários (supabase secrets set):
 *   ANTHROPIC_KEY         Chave da API Anthropic
 *
 * Supabase injeta automaticamente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHandler } from "./handler.ts";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

const handler = createHandler({
  getEnv: (key) => Deno.env.get(key),

  getUser: async (token) => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return { user: user ? { id: user.id } : null, error: error ?? null };
  },

  rpcRateLimit: async (userId, model) => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("check_and_log_ai_call", {
      p_user_id: userId,
      p_model: model,
    });
    return { data: data as { allowed: boolean } | null, error: error ?? null };
  },

  fetchAnthropic: async (payload, key) => {
    return await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
});

Deno.serve(handler);
