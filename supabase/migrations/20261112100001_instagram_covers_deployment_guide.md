# Guia de Implantação — Capas Reais do Instagram no CS Dash

**Branch:** `review/instagram-prototipo-v2-20261112`
**Data:** 2026-11-12
**Versão artefatos:** v2.0 (correções aplicadas 2026-11-12)
**Status:** Aguardando aprovação — NÃO aplicar em produção sem validação

---

## 0. O que exportar do n8n antes de qualquer alteração

Acesse o n8n, abra o workflow de sincronização do Instagram e exporte:

1. **JSON completo do workflow** (menu ⋮ → Export → Download)
2. Identifique os nós pelos nomes ou funções abaixo e anote:
   - Nó que chama a Meta Graph API para listar os posts da conta
     (geralmente um HTTP Request com URL contendo `graph.facebook.com`)
   - Nó de transformação/normalização dos dados (Function ou Code node)
   - Nó que grava no Supabase (HTTP Request para PostgREST ou Supabase node)
3. Copie o campo `fields` ou `fields[]` da requisição à Graph API (o parâmetro que lista quais campos são buscados por post)
4. Copie o SQL ou o payload do UPSERT que grava em `wpp.instagram_post_insights`

> Sem o JSON exportado não é possível identificar com segurança quais campos já são coletados nem onde inserir os novos nós.

---

## 1. Verificações pré-migration (executar no Supabase SQL Editor)

### 1a. Confirmar duplicatas por post_id

```sql
SELECT post_id, COUNT(*) AS total
FROM wpp.instagram_post_insights
GROUP BY post_id
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 20;
```

**Resultado esperado:** 0 linhas. Se retornar duplicatas, o UPSERT do workflow precisa ser corrigido antes de prosseguir.

### 1b. Verificar políticas RLS existentes

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'wpp' AND tablename = 'instagram_post_insights';
```

Anote as políticas. As novas colunas são cobertas automaticamente pelas políticas existentes em nível de linha — nenhuma política adicional é necessária.

### 1c. Confirmar permissões do role anon (usado pelo frontend)

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'wpp'
  AND table_name = 'instagram_post_insights'
  AND grantee IN ('anon', 'authenticated');
```

O role `anon` precisa de pelo menos `SELECT`. O n8n usa `service_role`, que tem acesso completo.

### 1d. Contagem atual de posts e amostra de tipos

```sql
SELECT
  media_type,
  COUNT(*)                          AS total,
  COUNT(CASE WHEN cover_url IS NULL THEN 1 END) AS sem_capa  -- após migration
FROM wpp.instagram_post_insights
GROUP BY media_type
ORDER BY total DESC;
```

---

## 2. Aplicar as migrations em ordem

**Não usar o Supabase CLI** — o schema `wpp` é gerenciado pelo n8n, não pelo repositório.

### 2a. Migration de colunas (`20261112100000`)

Execute no **Supabase SQL Editor** → New query → colar o SQL → Run.

Confirme o resultado:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'wpp'
  AND table_name = 'instagram_post_insights'
  AND column_name IN ('thumbnail_url','media_url','cover_source_url','cover_url','cover_synced_at');
```

Esperado: 5 linhas, todas com `is_nullable = YES`.

### 2b. Migration da stored procedure (`20261112100002`)

**Atenção — estratégia DROP + CREATE:**
O arquivo `20261112100002_upsert_instagram_post_insight_v2.sql` começa com um bloco `DO $$` que localiza e dropa todos os overloads existentes da função antes de criar a nova versão. Isso é necessário porque `CREATE OR REPLACE` com aridade diferente cria um overload em vez de substituir.

Execute o conteúdo de `20261112100002` no SQL Editor **após** a migration anterior.

Confirme o resultado:

```sql
SELECT proname, pronargs, proargnames,
       pg_get_function_identity_arguments(oid) AS signature
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'wpp'
  AND p.proname = 'upsert_instagram_post_insight';
```

Esperado: exatamente **1 linha**, `pronargs = 17`, `proargnames` inclui `p_thumbnail_url`, `p_media_url`, `p_cover_source_url`.

---

## 3. Criar o bucket no Supabase Storage

### 3a. Bucket: `instagram-covers`

No Supabase Dashboard → Storage → New Bucket:

| Parâmetro | Valor |
|-----------|-------|
| Nome | `instagram-covers` |
| Público | **Sim** (imagens são servidas diretamente ao navegador sem autenticação) |
| Tamanho máximo por arquivo | 5 MB (thumbnails são ~50–200 KB) |
| Tipos MIME permitidos | `image/jpeg`, `image/png`, `image/webp` |

### 3b. Estrutura de pastas

```
instagram-covers/
  eduardocristianoriginal/
    {post_id}.jpg
  costurandosucesso/
    {post_id}.jpg
```

A URL pública de cada imagem segue o padrão:
```
{SUPABASE_URL}/storage/v1/object/public/instagram-covers/{username}/{post_id}.jpg
```

Esta URL é **permanente** enquanto o bucket existir — não expira.

### 3c. Política de Storage (RLS no bucket)

Criar no Supabase SQL Editor:

```sql
-- Leitura pública (anon pode fazer GET)
CREATE POLICY "instagram-covers leitura pública"
ON storage.objects FOR SELECT
USING (bucket_id = 'instagram-covers');

-- Escrita apenas pelo service_role (n8n usa service_role key)
-- O service_role bypassa RLS por padrão — nenhuma política de INSERT/UPDATE é necessária.
```

### 3d. Prevenção de downloads duplicados

O n8n verifica `cover_synced_at IS NOT NULL` antes de tentar o download:

```sql
-- Query de seleção dos posts que ainda precisam de capa:
SELECT post_id, username, media_type, thumbnail_url, media_url
FROM wpp.instagram_post_insights
WHERE cover_url IS NULL
ORDER BY posted_at DESC;
```

Nunca sobrescreve um `cover_url` já preenchido com sucesso, a menos que `cover_synced_at` seja mais antigo que 90 dias (para renovação opcional futura).

### 3e. Tratamento de falhas

| Situação | Comportamento |
|----------|--------------|
| URL do Meta retorna 404/403 | Registrar falha, manter `cover_url = NULL`, não bloquear o processamento dos demais |
| Mídia removida/privada | Idem — o frontend exibe o ícone substituto |
| Timeout no download | Retentar 1 vez; se falhar, seguir para o próximo post |
| Arquivo > 5 MB | Ignorar upload, manter `cover_url = NULL` |
| post_id não encontrado na API | Registrar no log do n8n, não alterar o registro existente |

---

## 4. Especificação dos nós n8n a adicionar/modificar

### 4a. Nó existente: HTTP Request → Graph API (a MODIFICAR)

Adicionar ao parâmetro `fields` da URL da Graph API:

```
thumbnail_url,media_url,children{media_url,media_type,thumbnail_url}
```

**Exemplo de URL resultante:**
```
https://graph.facebook.com/v21.0/{{$json.account_id}}/media
  ?fields=id,media_type,permalink,caption,like_count,comments_count,
          shares,saved,reach,impressions,views,timestamp,
          thumbnail_url,media_url,
          children{media_url,media_type,thumbnail_url}
  &access_token={{$credentials.accessToken}}
  &limit=50
```

> Use a versão da API já configurada no workflow (não alterar de v21 para outra sem verificar).

### 4b. Novo nó: Function — Extração da capa (`Extract Cover URL`)

Inserir após o nó da Graph API, antes do nó de UPSERT:

```javascript
// Nó: Extract Cover URL
// Extrai a URL de capa correta por tipo de mídia
const item = $input.item.json;

let coverCandidate = null;
const mediaType = item.media_type ?? '';

if (mediaType === 'IMAGE') {
  coverCandidate = item.media_url ?? null;

} else if (mediaType === 'VIDEO') {
  // Reels: thumbnail_url é mais estável que media_url para vídeos
  coverCandidate = item.thumbnail_url ?? item.media_url ?? null;

} else if (mediaType === 'CAROUSEL_ALBUM') {
  // Primeiro filho do carrossel — pode ser imagem ou vídeo
  const firstChild = item.children?.data?.[0];
  if (firstChild) {
    if (firstChild.media_type === 'VIDEO') {
      coverCandidate = firstChild.thumbnail_url ?? firstChild.media_url ?? null;
    } else {
      coverCandidate = firstChild.media_url ?? null;
    }
  }
  // Fallback para a capa do próprio álbum (raro, mas possível)
  if (!coverCandidate) {
    coverCandidate = item.media_url ?? null;
  }
}

return {
  ...item,
  _cover_candidate: coverCandidate,
  _has_cover: Boolean(coverCandidate),
};
```

### 4c. Novo nó: IF — Verificar se tem URL de capa (`Has Cover URL?`)

```
Condição: {{ $json._has_cover }} === true
```

- **True branch** → próximo nó (download e upload)
- **False branch** → UPSERT sem campos de imagem (preserva métricas)

### 4d. Novo nó: HTTP Request — Download da capa (`Download Cover Image`)

```
Método: GET
URL: {{ $json._cover_candidate }}
Resposta: Binary Data
Nome do arquivo binário: cover
Timeout: 15 segundos
Continuar em caso de erro: Sim (para não bloquear o lote)
```

### 4e. Novo nó: Supabase Storage — Upload (`Upload to Storage`)

Usar o nó de Supabase ou HTTP Request para o Storage:

```
Método: POST
URL: {SUPABASE_URL}/storage/v1/object/instagram-covers/{{ $json.username }}/{{ $json.post_id }}.jpg
Headers:
  Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
  Content-Type: image/jpeg
  x-upsert: true          ← substitui se já existir (idempotente)
Body: (binary — arquivo baixado no nó anterior)
```

A URL pública resultante:
```javascript
const coverUrl = `${SUPABASE_URL}/storage/v1/object/public/instagram-covers/${item.username}/${item.post_id}.jpg`;
```

### 4f. Nó existente: UPSERT no Supabase (a MODIFICAR)

Adicionar ao payload do UPSERT (somente se o upload teve sucesso):

```json
{
  "thumbnail_url": "{{ $json.thumbnail_url }}",
  "media_url": "{{ $json.media_url }}",
  "cover_url": "{{ $json._storage_cover_url }}",
  "cover_synced_at": "{{ $now.toISO() }}"
}
```

O `ON CONFLICT (post_id) DO UPDATE` deve listar **apenas** os campos de imagem nas novas colunas — não tocar em `reach`, `impressions`, `like_count`, etc.

```sql
-- Exemplo do UPSERT seguro (apenas campos de imagem no UPDATE):
INSERT INTO wpp.instagram_post_insights
  (post_id, account_id, username, posted_at, media_type, permalink, caption,
   like_count, comments_count, shares, saved, reach, impressions, views, synced_at,
   thumbnail_url, media_url, cover_url, cover_synced_at)
VALUES (...)
ON CONFLICT (post_id) DO UPDATE SET
  -- Métricas: sempre atualizar com os valores mais recentes
  like_count      = EXCLUDED.like_count,
  comments_count  = EXCLUDED.comments_count,
  shares          = EXCLUDED.shares,
  saved           = EXCLUDED.saved,
  reach           = EXCLUDED.reach,
  impressions     = EXCLUDED.impressions,
  views           = EXCLUDED.views,
  synced_at       = EXCLUDED.synced_at,
  -- Imagens: atualizar SOMENTE se ainda não houver cover_url válido
  thumbnail_url   = EXCLUDED.thumbnail_url,
  media_url       = EXCLUDED.media_url,
  cover_url       = COALESCE(wpp.instagram_post_insights.cover_url, EXCLUDED.cover_url),
  cover_synced_at = COALESCE(wpp.instagram_post_insights.cover_synced_at, EXCLUDED.cover_synced_at);
```

O `COALESCE` garante que uma `cover_url` já persistida **não é sobrescrita** em sincronizações futuras.

---

## 5. Rotina de recuperação histórica (execução manual única)

Criar um workflow separado no n8n (ou usar o mesmo com um parâmetro de modo):

### Passo 1 — Listar posts sem capa

```sql
SELECT post_id, username, media_type
FROM wpp.instagram_post_insights
WHERE cover_url IS NULL
ORDER BY posted_at DESC
LIMIT 100;   -- processar em lotes de 100
```

### Passo 2 — Buscar campos de imagem na Graph API

Para cada `post_id`:

```
GET https://graph.facebook.com/v21.0/{post_id}
    ?fields=media_type,thumbnail_url,media_url,children{media_url,media_type,thumbnail_url}
    &access_token={TOKEN}
```

### Passo 3 — Seguir o mesmo fluxo dos nós 4b–4f acima

### Passo 4 — Relatório final

Ao final do lote, gerar relatório com:

| Categoria | Contagem |
|-----------|---------|
| Posts processados | N |
| Capas obtidas com sucesso | N |
| Sem URL disponível na API | N |
| Erro de download | N |
| Erro de upload | N |

Registrar no log do n8n ou exportar como JSON para análise.

### Lote seguinte

Reexecutar com `OFFSET 100`, `200`, etc., até `sem_capa = 0`.

> **Rate limit da Meta Graph API:** o limite padrão para a Graph API é 200 chamadas por hora por token de usuário, ou 4.800/hora para tokens de página com permissão avançada. Ajuste o delay entre chamadas conforme o volume de posts históricos e o tipo de token configurado no workflow. Não assumir intervalo fixo — verificar o header `X-App-Usage` nas respostas da API.

---

## 6. Alterações no frontend (já aplicadas na branch)

### `src/hooks/useInstagramInsights.ts`

Adicionados 3 campos opcionais à interface `InstagramPostInsight`:

```typescript
cover_url?: string | null;      // URL permanente no Supabase Storage
thumbnail_url?: string | null;  // URL original Meta CDN — Reels/Vídeos
media_url?: string | null;      // URL original Meta CDN — Imagens e Carrosséis
```

O `select("*")` existente já traz as novas colunas automaticamente após a migration.

### `src/components/InstagramExecutivoCS.tsx`

Função `thumb()` linha 80 — apenas a ordem de prioridade:

```typescript
// Antes:
const candidate = media.thumbnail_url || media.media_url || "";

// Depois:
const candidate = media.cover_url || media.thumbnail_url || media.media_url || "";
```

Nenhuma outra linha do componente foi alterada.

---

## 7. Prova de conceito — 3 publicações reais (POC controlada)

Executar manualmente o workflow atualizado para exatamente **3 posts**: um de cada tipo. Os post_ids devem ser escolhidos consultando a tabela antes da execução para confirmar os tipos disponíveis.

### Passo 1 — Identificar os 3 posts candidatos

```sql
-- Um de cada tipo, mais recentes
SELECT post_id, username, media_type, posted_at,
       cover_source_url, thumbnail_url, media_url
FROM wpp.instagram_post_insights
WHERE media_type IN ('IMAGE', 'VIDEO', 'CAROUSEL_ALBUM')
  AND cover_url IS NULL
ORDER BY media_type, posted_at DESC;
```

Escolher 1 `post_id` de cada `media_type` para o POC.

### Passo 2 — Executar o workflow de Insights atualizado para esses posts

No n8n: executar o workflow de Insights manualmente, verificar que os campos `thumbnail_url`, `media_url` e `cover_source_url` foram preenchidos nos 3 posts escolhidos:

```sql
SELECT post_id, media_type, thumbnail_url, media_url, cover_source_url
FROM wpp.instagram_post_insights
WHERE post_id IN ('<post_id_imagem>', '<post_id_reel>', '<post_id_carrossel>');
```

Esperado: `cover_source_url` não-nulo para todos os 3.

### Passo 3 — Executar o workflow de Storage para os 3 posts

No n8n: executar o workflow `Instagram Cover Storage Sync` manualmente (clique em "Execute Workflow"). O workflow de Storage buscará apenas posts com `cover_url IS NULL` e `cover_source_url NOT NULL`.

### Passo 4 — Validar os resultados

**No Supabase SQL Editor:**
```sql
SELECT post_id, media_type, cover_url, cover_synced_at
FROM wpp.instagram_post_insights
WHERE post_id IN ('<post_id_imagem>', '<post_id_reel>', '<post_id_carrossel>');
```
Esperado: `cover_url` preenchido e `cover_synced_at` recente para todos os 3.

**No Supabase Storage (bucket instagram-covers):** navegar até a pasta da conta e confirmar que os 3 arquivos existem com a extensão correta (`.jpg`, `.png` ou `.webp` — NÃO necessariamente `.jpg`).

**No navegador:** abrir cada `cover_url` diretamente e confirmar que a imagem carrega sem erros.

**No CS Dash (ambiente de desenvolvimento):** abrir a página Instagram, selecionar o período que inclui os 3 posts, confirmar que as capas reais aparecem nos cards de Destaques do Período e na tabela Posts do Período.

### Passo 5 — Verificar ausência de regressões

- Métricas dos 3 posts (reach, impressions, like_count etc.) permanecem inalteradas
- Outros posts sem capa continuam exibindo o ícone substituto (não quebraram)
- Demais páginas do CS Dash (WhatsApp, Financeiro, etc.) funcionam normalmente

---

## 8. Variáveis de ambiente necessárias no n8n

O workflow de Storage usa `{{ $env.SUPABASE_URL }}` e `{{ $env.SUPABASE_SERVICE_KEY }}`.

Configurar antes de ativar (n8n Settings → Variables):

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | `https://<seu-projeto>.supabase.co` (sem barra final) |
| `SUPABASE_SERVICE_KEY` | service_role key do projeto (NÃO a anon key) |

A service_role key fica em: Supabase Dashboard → Settings → API → `service_role` (secret).

---

## 9. Checklist de aprovação antes da implantação completa

- [ ] JSON do workflow n8n original exportado como backup
- [ ] Query de duplicatas executada — resultado: 0 linhas
- [ ] Políticas RLS confirmadas
- [ ] Migration `20261112100000` aplicada — 5 colunas confirmadas
- [ ] Migration `20261112100002` aplicada — stored procedure com 17 params confirmada (1 linha em pg_proc)
- [ ] Bucket `instagram-covers` criado como público
- [ ] Política de leitura pública criada no bucket
- [ ] Variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` configuradas no n8n
- [ ] Workflow de Insights atualizado com os 6 nós modificados
- [ ] POC: 3 posts identificados (1 IMAGE, 1 VIDEO, 1 CAROUSEL_ALBUM)
- [ ] POC: `cover_source_url` preenchido para os 3 após sync de Insights
- [ ] POC: workflow de Storage executado manualmente
- [ ] POC: `cover_url` preenchido para os 3 — extensão correta (não necessariamente .jpg)
- [ ] POC: 3 URLs abertas no navegador — imagens carregam
- [ ] POC: CS Dash (dev) exibe as 3 capas reais
- [ ] POC: métricas dos 3 posts permanecem inalteradas
- [ ] Rotina histórica executada em lote (posts sem `cover_source_url` → re-sync via Insights)
- [ ] Relatório de recuperação histórica gerado pelo Log Resumo Final
