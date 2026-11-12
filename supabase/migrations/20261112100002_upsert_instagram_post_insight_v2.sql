-- =============================================================================
-- Migration: upsert_instagram_post_insight v2
-- Schema: wpp
-- Objetivo: adicionar campos de imagem à stored procedure de UPSERT, mantendo
--           compatibilidade retroativa via DEFAULT NULL nos novos parâmetros.
--
-- APLICAR APÓS: 20261112100000_instagram_post_covers.sql
-- APLICAR VIA:  Supabase SQL Editor (schema wpp não é gerenciado pelo CLI)
--
-- ⚠️  ESTRATÉGIA DE SUBSTITUIÇÃO — LEIA ANTES DE APLICAR ⚠️
-- ─────────────────────────────────────────────────────────
-- PostgreSQL resolve funções por aridade (número de parâmetros).
-- CREATE OR REPLACE com contagem diferente de parâmetros CRIA UM OVERLOAD —
-- a função original de 14 parâmetros continua existindo e continua sendo
-- chamada pelo workflow antigo (PostgREST envia params pelo nome em JSON;
-- o banco resolve para a assinatura com a aridade correspondente).
--
-- A estratégia correta é:
--   1. Descobrir a assinatura exata atual (Step 0 abaixo)
--   2. DROP explícito da assinatura antiga
--   3. CREATE da nova função com DEFAULT NULL nos novos parâmetros
--
-- Com DEFAULT NULL, chamadas que enviam apenas 14 parâmetros nomeados
-- continuam funcionando: o banco aplica NULL para os parâmetros ausentes.
-- =============================================================================

-- ─── Step 0: Verificar assinatura atual (executar antes de prosseguir) ────────
--
-- SELECT p.proname,
--        p.pronargs,
--        p.proargnames,
--        pg_get_function_identity_arguments(p.oid) AS args_signature
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'wpp'
--   AND p.proname = 'upsert_instagram_post_insight';
--
-- Resultado esperado ANTES desta migration:
--   pronargs = 14, sem parâmetros de imagem.
-- Resultado esperado DEPOIS desta migration:
--   pronargs = 17, inclui p_thumbnail_url, p_media_url, p_cover_source_url.
-- Se retornar mais de uma linha, existe overload residual — applique o DROP
-- manual correspondente antes de prosseguir.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Step 1: DROP da assinatura original de 14 parâmetros ────────────────────
-- Usa um bloco DO para localizar e dropar TODOS os overloads existentes,
-- protegendo contra variações de tipo na assinatura original.
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

-- ─── Step 2: CREATE da nova função com 17 parâmetros ─────────────────────────
-- Os últimos 3 parâmetros têm DEFAULT NULL → retrocompatível com chamadas
-- que enviam apenas os 14 originais (PostgREST usa params nomeados em JSON).
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
  -- Novos parâmetros opcionais de imagem (DEFAULT NULL = retrocompatível)
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
    -- Métricas: sempre atualizar com o valor mais recente da API
    like_count         = EXCLUDED.like_count,
    comments_count     = EXCLUDED.comments_count,
    shares             = EXCLUDED.shares,
    saved              = EXCLUDED.saved,
    reach              = EXCLUDED.reach,
    impressions        = EXCLUDED.impressions,
    views              = EXCLUDED.views,
    synced_at          = EXCLUDED.synced_at,
    -- URLs brutas: atualizar se vieram com valor; preservar se vieram NULL
    -- (evita sobrescrever URL válida com NULL em re-syncs parciais)
    thumbnail_url      = COALESCE(EXCLUDED.thumbnail_url,
                                  wpp.instagram_post_insights.thumbnail_url),
    media_url          = COALESCE(EXCLUDED.media_url,
                                  wpp.instagram_post_insights.media_url),
    cover_source_url   = COALESCE(EXCLUDED.cover_source_url,
                                  wpp.instagram_post_insights.cover_source_url);
    -- cover_url e cover_synced_at NÃO são tocados aqui —
    -- gerenciados exclusivamente pelo workflow de Storage separado.
END;
$$;

-- ─── Step 3: Grants ───────────────────────────────────────────────────────────
-- service_role: usado pelo n8n para chamadas RPC via PostgREST
GRANT EXECUTE ON FUNCTION wpp.upsert_instagram_post_insight(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  TEXT, TEXT, TEXT
) TO service_role;

-- anon/authenticated: leitura via frontend (SELECT já coberto por RLS)
-- A função usa SECURITY DEFINER, portanto o n8n não precisa de permissões
-- adicionais de INSERT/UPDATE na tabela.

-- ─── Step 4: Verificação pós-aplicação ───────────────────────────────────────
-- Execute no SQL Editor para confirmar a migration:
--
-- SELECT proname,
--        pronargs,
--        proargnames,
--        pg_get_function_identity_arguments(oid) AS signature
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'wpp'
--   AND p.proname = 'upsert_instagram_post_insight';
--
-- Esperado: exatamente 1 linha, pronargs = 17,
-- proargnames inclui p_thumbnail_url, p_media_url, p_cover_source_url.
