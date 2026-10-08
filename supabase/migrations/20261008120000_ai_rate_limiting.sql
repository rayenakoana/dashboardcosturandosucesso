-- Migração: controle de consumo da Edge Function claude-proxy
--
-- Ativa somente após RATE_LIMIT_ENABLED=true ser configurado nos Supabase secrets.
-- A Edge Function faz fail-open se esta migração ainda não foi aplicada.
--
-- Limites iniciais (ajustáveis no RPC):
--   20 chamadas por hora por usuário (p_window_minutes=60, p_max_calls=20)

-- ── Tabela de registro de uso ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id          bigserial    PRIMARY KEY,
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  called_at   timestamptz  NOT NULL DEFAULT now(),
  model       text
);

-- Índice para consultas de janela deslizante por usuário.
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_called
  ON ai_usage_log (user_id, called_at DESC);

-- RLS ativo — acesso concedido apenas ao service role (Edge Function).
-- Nenhuma policy de usuário: usuários não podem ler nem escrever diretamente.
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- ── Função de check + log atômico ────────────────────────────────────────────
-- Usa pg_advisory_xact_lock para serializar chamadas do mesmo usuário,
-- prevenindo ultrapassagem de limites em requisições simultâneas.
-- SECURITY DEFINER: executa com direitos do owner (postgres) — bypassa RLS.

CREATE OR REPLACE FUNCTION check_and_log_ai_call(
  p_user_id       uuid,
  p_model         text,
  p_window_minutes int DEFAULT 60,
  p_max_calls      int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_count int;
BEGIN
  -- Lock por usuário: serializa chamadas concorrentes do mesmo user_id.
  -- Usa hash do UUID como chave de advisory lock (integer de 64 bits).
  PERFORM pg_advisory_xact_lock(('x' || substr(md5(p_user_id::text), 1, 15))::bit(60)::bigint);

  SELECT COUNT(*)
    INTO v_recent_count
    FROM ai_usage_log
   WHERE user_id   = p_user_id
     AND called_at > now() - (p_window_minutes || ' minutes')::interval;

  IF v_recent_count >= p_max_calls THEN
    RETURN jsonb_build_object(
      'allowed',       false,
      'recent_calls',  v_recent_count,
      'limit',         p_max_calls,
      'window_minutes', p_window_minutes
    );
  END IF;

  INSERT INTO ai_usage_log (user_id, model)
  VALUES (p_user_id, p_model);

  RETURN jsonb_build_object(
    'allowed',       true,
    'recent_calls',  v_recent_count + 1,
    'limit',         p_max_calls,
    'window_minutes', p_window_minutes
  );
END;
$$;

-- ── Restrição de execução do RPC ─────────────────────────────────────────────
-- Sem REVOKE, qualquer usuário autenticado poderia chamar este RPC via REST API
-- e passar um p_user_id arbitrário, esgotando a cota de outro usuário.
-- Apenas o service_role (usado pela Edge Function) pode executar.
REVOKE EXECUTE ON FUNCTION check_and_log_ai_call(uuid, text, int, int)
  FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION check_and_log_ai_call(uuid, text, int, int)
  TO service_role;

-- Comentário de ativação:
-- 1. Aplicar esta migração: supabase db push
-- 2. Ativar na Edge Function: supabase secrets set RATE_LIMIT_ENABLED=true
-- 3. Fail-closed opcional: supabase secrets set RATE_LIMIT_STRICT=true
-- 4. Fazer deploy: supabase functions deploy claude-proxy
