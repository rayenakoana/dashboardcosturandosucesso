-- =============================================================================
-- Migration: instagram_post_covers
-- Tabela: wpp.instagram_post_insights
-- Objetivo: adicionar campos de imagem de capa sem alterar métricas existentes
--
-- ATENÇÃO: o schema "wpp" é gerenciado pelo n8n, não pelo Supabase CLI.
-- Esta migration deve ser aplicada manualmente via Supabase SQL Editor
-- (ou executada pela service_role do n8n) ANTES de atualizar o workflow.
--
-- Idempotente: usa ADD COLUMN IF NOT EXISTS em todas as colunas.
-- Não remove, não altera e não recria colunas existentes.
-- =============================================================================

-- 1. Adicionar colunas de imagem
ALTER TABLE wpp.instagram_post_insights
  ADD COLUMN IF NOT EXISTS thumbnail_url   TEXT,
  ADD COLUMN IF NOT EXISTS media_url       TEXT,
  ADD COLUMN IF NOT EXISTS cover_url       TEXT,
  ADD COLUMN IF NOT EXISTS cover_synced_at TIMESTAMPTZ;

-- 2. Comentários descritivos
COMMENT ON COLUMN wpp.instagram_post_insights.thumbnail_url
  IS 'URL original da thumbnail fornecida pela Meta Graph API (CDN do Meta — pode expirar). Usada para Reels/Vídeos.';

COMMENT ON COLUMN wpp.instagram_post_insights.media_url
  IS 'URL original da mídia fornecida pela Meta Graph API (CDN do Meta — pode expirar). Usada para Imagens e primeiro filho de Carrosséis.';

COMMENT ON COLUMN wpp.instagram_post_insights.cover_url
  IS 'URL permanente da miniatura armazenada no Supabase Storage (bucket instagram-covers). Formato: instagram-covers/{username}/{post_id}.jpg. Null enquanto o download ainda não foi realizado.';

COMMENT ON COLUMN wpp.instagram_post_insights.cover_synced_at
  IS 'Timestamp UTC do último download bem-sucedido da capa para o Supabase Storage. Null se ainda não baixado ou se o download falhou.';

-- 3. Verificação de duplicatas por post_id
-- Execute esta query ANTES de aplicar a migration para confirmar unicidade:
--
--   SELECT post_id, COUNT(*) AS total
--   FROM wpp.instagram_post_insights
--   GROUP BY post_id
--   HAVING COUNT(*) > 1
--   ORDER BY total DESC
--   LIMIT 20;
--
-- Se retornar linhas, o workflow de UPSERT precisa de revisão antes de prosseguir.

-- 4. Índice parcial para acelerar a rotina de recuperação histórica
-- (localiza rapidamente publicações ainda sem capa)
CREATE INDEX IF NOT EXISTS idx_ig_post_cover_null
  ON wpp.instagram_post_insights (posted_at DESC)
  WHERE cover_url IS NULL;

-- 5. RLS: a política existente da tabela já cobre as novas colunas automaticamente.
-- Não é necessário criar políticas adicionais — confirme com:
--
--   SELECT policyname, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'wpp' AND tablename = 'instagram_post_insights';
