-- =============================================================================
-- ⚠️  ARQUIVO COMPLETAMENTE NEUTRALIZADO — TODO O SQL EXECUTÁVEL ESTÁ
--     DENTRO DE BLOCO DE COMENTÁRIO. ESTE ARQUIVO NÃO FAZ NADA SE RODADO.
-- =============================================================================
-- Substituído por: 20261112100003_upsert_instagram_post_insight_v2.sql
--
-- Motivos:
--   1. Usava DROP nas funções existentes — risco destrutivo desnecessário.
--   2. Usava SECURITY DEFINER — a função original usa SECURITY INVOKER.
--   3. Não envolvia DDL em transação.
--   4. Não revogava EXECUTE de PUBLIC/anon/authenticated.
--
-- Para referência histórica, o SQL original foi preservado abaixo dentro de
-- um bloco /* ... */ que o PostgreSQL ignora completamente.
-- =============================================================================

/*
==== INÍCIO DO BLOCO NEUTRALIZADO — NÃO EDITAR ====

-- ─── Step 1: DROP da assinatura original ─────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'wpp'
      AND p.proname = 'upsert_instagram_post_insight'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS wpp.upsert_instagram_post_insight(%s)',
      r.args
    );
    RAISE NOTICE 'Dropped: wpp.upsert_instagram_post_insight(%)', r.args;
  END LOOP;
END;
$$;

-- ─── Step 2: CREATE ───────────────────────────────────────────────────────────
CREATE FUNCTION wpp.upsert_instagram_post_insight(
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
    post_id, account_id, username, posted_at, media_type, permalink, caption,
    like_count, comments_count, shares, saved, reach, impressions, views,
    synced_at, thumbnail_url, media_url, cover_source_url
  )
  VALUES (
    p_post_id, p_account_id, p_username, p_posted_at, p_media_type, p_permalink,
    p_caption, p_like_count, p_comments_count, p_shares, p_saved, p_reach,
    p_impressions, p_views, now(), p_thumbnail_url, p_media_url, p_cover_source_url
  )
  ON CONFLICT (post_id) DO UPDATE SET
    like_count        = EXCLUDED.like_count,
    comments_count    = EXCLUDED.comments_count,
    shares            = EXCLUDED.shares,
    saved             = EXCLUDED.saved,
    reach             = EXCLUDED.reach,
    impressions       = EXCLUDED.impressions,
    views             = EXCLUDED.views,
    synced_at         = EXCLUDED.synced_at,
    thumbnail_url     = COALESCE(EXCLUDED.thumbnail_url,
                                 wpp.instagram_post_insights.thumbnail_url),
    media_url         = COALESCE(EXCLUDED.media_url,
                                 wpp.instagram_post_insights.media_url),
    cover_source_url  = COALESCE(EXCLUDED.cover_source_url,
                                 wpp.instagram_post_insights.cover_source_url);
END;
$$;

-- ─── Step 3: Grants ───────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) TO service_role;

==== FIM DO BLOCO NEUTRALIZADO ====
*/
