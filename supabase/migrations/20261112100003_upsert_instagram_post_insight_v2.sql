-- =============================================================================
-- Migration: upsert_instagram_post_insight_v2
-- Schema: wpp
-- Objetivo: criar função NOVA com suporte a campos de imagem.
--           A função original (upsert_instagram_post_insight) é preservada
--           intacta — o workflow existente continua chamando-a sem alteração.
--
-- A nova função é chamada pelo workflow de Insights ATUALIZADO via:
--   POST /rest/v1/rpc/upsert_instagram_post_insight_v2
--
-- APLICAR APÓS: 20261112100000_instagram_post_covers.sql
-- APLICAR VIA:  Supabase SQL Editor (schema wpp não é gerenciado pelo CLI)
-- =============================================================================

-- ─── Verificação pré-aplicação ────────────────────────────────────────────────
-- Execute antes para confirmar que a função original NÃO será afetada:
--
-- SELECT proname, pronargs, proargnames
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'wpp'
--   AND p.proname LIKE 'upsert_instagram_post_insight%';
--
-- Esperado antes: 1 linha (upsert_instagram_post_insight, pronargs=14)
-- Esperado depois: 2 linhas (original 14 params + nova _v2 com 17 params)
-- ─────────────────────────────────────────────────────────────────────────────

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
  p_thumbnail_url     TEXT    DEFAULT NULL,
  p_media_url         TEXT    DEFAULT NULL,
  p_cover_source_url  TEXT    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = wpp, public
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
    like_count         = EXCLUDED.like_count,
    comments_count     = EXCLUDED.comments_count,
    shares             = EXCLUDED.shares,
    saved              = EXCLUDED.saved,
    reach              = EXCLUDED.reach,
    impressions        = EXCLUDED.impressions,
    views              = EXCLUDED.views,
    synced_at          = EXCLUDED.synced_at,
    thumbnail_url      = COALESCE(EXCLUDED.thumbnail_url,
                                  wpp.instagram_post_insights.thumbnail_url),
    media_url          = COALESCE(EXCLUDED.media_url,
                                  wpp.instagram_post_insights.media_url),
    cover_source_url   = COALESCE(EXCLUDED.cover_source_url,
                                  wpp.instagram_post_insights.cover_source_url);
    -- cover_url e cover_synced_at: gerenciados pelo workflow de Storage.
END;
$$;

GRANT EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight_v2(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) TO service_role;

-- ─── Verificação pós-aplicação ────────────────────────────────────────────────
-- SELECT proname, pronargs, proargnames
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'wpp'
--   AND p.proname LIKE 'upsert_instagram_post_insight%';
--
-- Esperado: 2 linhas.
-- Linha 1: upsert_instagram_post_insight,    pronargs=14  (original, intacta)
-- Linha 2: upsert_instagram_post_insight_v2, pronargs=17  (nova)
