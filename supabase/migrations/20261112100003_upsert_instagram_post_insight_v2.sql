-- =============================================================================
-- Migration: upsert_instagram_post_insight_v2
-- Schema: wpp
-- Aplicar via: Supabase SQL Editor (schema wpp não é gerenciado pelo CLI)
-- Aplicar após: 20261112100000_instagram_post_covers.sql
-- =============================================================================
--
-- O QUE ESTE ARQUIVO FAZ
-- ──────────────────────
-- Cria SOMENTE a nova função wpp.upsert_instagram_post_insight_v2.
-- A função original de 14 parâmetros (wpp.upsert_instagram_post_insight)
-- é preservada intacta — o workflow existente continua chamando-a sem
-- qualquer alteração.
--
-- SEGURANÇA
-- ─────────
-- SECURITY INVOKER: a função executa com os privilégios de quem a chama
-- (service_role). Isso é consistente com a função original.
-- REVOKE EXECUTE FROM PUBLIC/anon/authenticated: impede que roles do
-- frontend chamem esta função diretamente via PostgREST.
-- GRANT EXECUTE TO service_role: apenas o n8n (via service_role) pode
-- chamar esta função.
--
-- TRANSAÇÃO
-- ─────────
-- CREATE OR REPLACE + REVOKE + GRANT estão na mesma transação.
-- Se qualquer instrução falhar, nada é persistido.
--
-- =============================================================================

-- ─── VERIFICAÇÕES PRÉ-APLICAÇÃO (executar antes, não fazem parte da tx) ──────
--
-- 1. Confirmar que a função original está intacta e será preservada:
--
--    SELECT proname, pronargs, proargnames,
--           CASE prosecdef WHEN true THEN 'SECURITY DEFINER'
--                          ELSE 'SECURITY INVOKER' END AS security
--    FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'wpp'
--      AND p.proname LIKE 'upsert_instagram_post_insight%';
--
--    Esperado antes: 1 linha (original, pronargs=14, SECURITY INVOKER).
--    Esperado depois: 2 linhas (original intacta + nova _v2 pronargs=17).
--
-- 2. Confirmar que service_role tem BYPASSRLS (necessário com SECURITY INVOKER):
--
--    SELECT rolname, rolbypassrls
--    FROM pg_roles
--    WHERE rolname = 'service_role';
--
--    Esperado: rolbypassrls = true.
--    Se false, a função com SECURITY INVOKER será bloqueada pelo RLS da tabela.
--
-- 3. Confirmar que service_role tem SELECT na tabela
--    (necessário para o ON CONFLICT ler valores existentes via EXCLUDED):
--
--    SELECT grantee, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE table_schema = 'wpp'
--      AND table_name   = 'instagram_post_insights'
--      AND grantee      = 'service_role';
--
--    Esperado: SELECT, INSERT, UPDATE presentes.
--    Já confirmados: INSERT = true, UPDATE = true.
--    Verificar SELECT antes de aplicar.
--
-- 4. Listar políticas RLS ativas na tabela:
--
--    SELECT policyname, cmd, roles, qual, with_check
--    FROM pg_policies
--    WHERE schemaname = 'wpp'
--      AND tablename  = 'instagram_post_insights';
--
--    Verificar se existe alguma política que bloqueie INSERT/UPDATE por
--    service_role. Com BYPASSRLS=true, o service_role ignora todas as
--    políticas RLS — mas documentar as políticas existentes é boa prática.
--
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ─── 1. Criar a nova função ───────────────────────────────────────────────────
-- CREATE OR REPLACE: idempotente — pode ser reaplicada sem efeito colateral
-- se a assinatura for idêntica.

CREATE OR REPLACE FUNCTION wpp.upsert_instagram_post_insight_v2(
  p_post_id           TEXT,
  p_account_id        TEXT,
  p_username          TEXT,
  p_posted_at         TIMESTAMPTZ,
  p_media_type        TEXT,
  p_permalink         TEXT,
  p_caption           TEXT,
  p_like_count        INTEGER,
  p_comments_count    INTEGER,
  p_shares            INTEGER,
  p_saved             INTEGER,
  p_reach             INTEGER,
  p_impressions       INTEGER,
  p_views             INTEGER,
  -- Novos parâmetros opcionais (DEFAULT NULL = retrocompatível com chamadas
  -- que enviam apenas os 14 originais via PostgREST RPC com params nomeados)
  p_thumbnail_url     TEXT DEFAULT NULL,
  p_media_url         TEXT DEFAULT NULL,
  p_cover_source_url  TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER   -- executa com os privilégios de service_role (chamador)
AS $$
BEGIN
  INSERT INTO wpp.instagram_post_insights (
    post_id,
    account_id,
    username,
    posted_at,
    media_type,
    permalink,
    caption,
    like_count,
    comments_count,
    shares,
    saved,
    reach,
    impressions,
    views,
    synced_at,
    -- Novas colunas de imagem (adicionadas por 20261112100000)
    thumbnail_url,
    media_url,
    cover_source_url
  )
  VALUES (
    p_post_id,
    p_account_id,
    p_username,
    p_posted_at,
    p_media_type,
    p_permalink,
    p_caption,
    p_like_count,
    p_comments_count,
    p_shares,
    p_saved,
    p_reach,
    p_impressions,
    p_views,
    now(),
    p_thumbnail_url,
    p_media_url,
    p_cover_source_url
  )
  ON CONFLICT (post_id) DO UPDATE SET
    -- ── Métricas: lógica idêntica à função original ──────────────────────────
    -- Sempre substituir pelo valor mais recente da API (re-sync diário).
    like_count      = EXCLUDED.like_count,
    comments_count  = EXCLUDED.comments_count,
    shares          = EXCLUDED.shares,
    saved           = EXCLUDED.saved,
    reach           = EXCLUDED.reach,
    impressions     = EXCLUDED.impressions,
    views           = EXCLUDED.views,
    synced_at       = EXCLUDED.synced_at,
    -- ── URLs brutas de imagem (novas colunas) ────────────────────────────────
    -- COALESCE: preserva o valor existente se o parâmetro chegou como NULL.
    -- Isso evita que re-syncs posteriores (que já têm a URL) a sobrescrevam
    -- com NULL quando o campo não for enviado na chamada.
    thumbnail_url   = COALESCE(EXCLUDED.thumbnail_url,
                               wpp.instagram_post_insights.thumbnail_url),
    media_url       = COALESCE(EXCLUDED.media_url,
                               wpp.instagram_post_insights.media_url),
    cover_source_url = COALESCE(EXCLUDED.cover_source_url,
                                wpp.instagram_post_insights.cover_source_url);
    -- ── cover_url e cover_synced_at: NÃO tocados aqui ───────────────────────
    -- Gerenciados exclusivamente pelo workflow Instagram Cover Storage Sync.
    -- O UPSERT de Insights nunca deve sobrescrever uma capa já persistida
    -- no Supabase Storage.
END;
$$;

-- ─── 2. Revogar EXECUTE de PUBLIC, anon e authenticated ───────────────────────
-- PostgreSQL concede EXECUTE a PUBLIC automaticamente ao criar uma função.
-- Revogar explicitamente de PUBLIC remove esse grant padrão.
-- Revogar de anon e authenticated garante que o frontend não possa chamar
-- esta função diretamente via PostgREST (mesmo que PUBLIC fosse mantido).

REVOKE EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight_v2(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight_v2(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) FROM anon;

REVOKE EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight_v2(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) FROM authenticated;

-- ─── 3. Conceder EXECUTE somente a service_role ───────────────────────────────
-- service_role é o role usado pelo n8n para chamadas RPC via PostgREST.

GRANT EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight_v2(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) TO service_role;

COMMIT;

-- ─── VERIFICAÇÕES PÓS-APLICAÇÃO (executar no SQL Editor após o COMMIT) ────────
--
-- 1. Confirmar as duas funções coexistem (original intacta + nova _v2):
--
--    SELECT proname, pronargs, proargnames,
--           CASE prosecdef WHEN true THEN 'SECURITY DEFINER'
--                          ELSE 'SECURITY INVOKER' END AS security
--    FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'wpp'
--      AND p.proname LIKE 'upsert_instagram_post_insight%'
--    ORDER BY proname;
--
--    Esperado:
--      upsert_instagram_post_insight    | 14 params | SECURITY INVOKER
--      upsert_instagram_post_insight_v2 | 17 params | SECURITY INVOKER
--
-- 2. Confirmar que apenas service_role pode executar a nova função:
--
--    SELECT grantee, privilege_type
--    FROM information_schema.routine_privileges
--    WHERE routine_schema = 'wpp'
--      AND routine_name   = 'upsert_instagram_post_insight_v2';
--
--    Esperado: apenas 1 linha, grantee = 'service_role', privilege_type = 'EXECUTE'.
--    Se retornar PUBLIC, anon ou authenticated, o REVOKE não foi aplicado.
--
-- 3. Testar a chamada via PostgREST (usar service_role key no Authorization):
--
--    POST {SUPABASE_URL}/rest/v1/rpc/upsert_instagram_post_insight_v2
--    Authorization: Bearer {SERVICE_ROLE_KEY}
--    Content-Profile: wpp
--    Content-Type: application/json
--
--    Body (usar um post_id existente na tabela, não criar dados novos):
--    {
--      "p_post_id":        "<post_id_existente>",
--      "p_account_id":     "<account_id>",
--      "p_username":       "<username>",
--      "p_posted_at":      "<ISO timestamp>",
--      "p_media_type":     "IMAGE",
--      "p_permalink":      "<url>",
--      "p_caption":        "teste v2",
--      "p_like_count":     0,
--      "p_comments_count": 0,
--      "p_shares":         0,
--      "p_saved":          0,
--      "p_reach":          0,
--      "p_impressions":    0,
--      "p_views":          0
--    }
--
--    Esperado: HTTP 204 No Content (sucesso, sem corpo de resposta).
--    Verificar que o registro existente não foi alterado em colunas não enviadas.
