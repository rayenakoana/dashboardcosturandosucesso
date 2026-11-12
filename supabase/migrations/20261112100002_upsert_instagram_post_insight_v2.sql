-- =============================================================================
-- Migration: upsert_instagram_post_insight v2
-- Schema: wpp
-- Objetivo: adicionar campos de imagem à stored procedure de UPSERT de posts,
--           mantendo compatibilidade retroativa com chamadas sem esses campos.
--
-- APLICAR APÓS: 20261112100000_instagram_post_covers.sql
-- APLICAR VIA: Supabase SQL Editor (schema wpp não é gerenciado pelo CLI)
-- ORDEM OBRIGATÓRIA: migration de colunas primeiro, depois esta procedure.
-- =============================================================================

-- Substituição da stored procedure existente.
-- Os novos parâmetros são opcionais (DEFAULT NULL) → chamadas do workflow
-- antigo continuam funcionando sem nenhuma alteração.
CREATE OR REPLACE FUNCTION wpp.upsert_instagram_post_insight(
  p_post_id         TEXT,
  p_account_id      TEXT,
  p_username        TEXT,
  p_posted_at       TIMESTAMPTZ,
  p_media_type      TEXT,
  p_permalink       TEXT,
  p_caption         TEXT,
  p_like_count      INTEGER,
  p_comments_count  INTEGER,
  p_shares          INTEGER,
  p_saved           INTEGER,
  p_reach           INTEGER,
  p_impressions     INTEGER,
  p_views           INTEGER,
  -- Novos parâmetros opcionais de imagem:
  p_thumbnail_url   TEXT DEFAULT NULL,
  p_media_url       TEXT DEFAULT NULL
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
    media_url
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
    p_media_url
  )
  ON CONFLICT (post_id) DO UPDATE SET
    -- Métricas: sempre atualizar com o valor mais recente da API
    like_count      = EXCLUDED.like_count,
    comments_count  = EXCLUDED.comments_count,
    shares          = EXCLUDED.shares,
    saved           = EXCLUDED.saved,
    reach           = EXCLUDED.reach,
    impressions     = EXCLUDED.impressions,
    views           = EXCLUDED.views,
    synced_at       = EXCLUDED.synced_at,
    -- Imagens: atualizar URLs brutas (Meta CDN) se chegaram com valor
    thumbnail_url   = COALESCE(EXCLUDED.thumbnail_url, wpp.instagram_post_insights.thumbnail_url),
    media_url       = COALESCE(EXCLUDED.media_url, wpp.instagram_post_insights.media_url);
    -- cover_url NÃO é atualizado aqui — gerenciado pelo workflow de Storage separado
END;
$$;

-- Garantir permissão de execução para o role service_role (usado pelo n8n)
GRANT EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight(
  TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT,TEXT,TEXT,
  INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,
  TEXT,TEXT
) TO service_role;

-- Verificação pós-aplicação:
-- SELECT proname, pronargs, proargnames
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'wpp' AND p.proname = 'upsert_instagram_post_insight';
-- Esperado: pronargs = 16, proargnames inclui p_thumbnail_url e p_media_url
