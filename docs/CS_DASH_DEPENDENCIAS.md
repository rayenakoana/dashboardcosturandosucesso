# CS Dash — Mapa de Dependências

> Gerado em 2026-10-07 — FASE 0 Segurança e Estabilização

---

## Páginas → Componentes → Hooks → Tabelas → Integrações

### `/` — Index (Dashboard Principal)

| Camada | Item |
|--------|------|
| Componentes | `KPICard`, `LeadsDiariosCard`, `MetaXVendidoFunil`, `AIAnalysisButton`, `AppSidebar`, `TopNav` |
| Hooks | `useQuery` (inline), `useLeadsGeografia` |
| Tabelas (leitura) | `vendas`, `leads_diarios_por_funil`, `leads_geografia`, `reunioes_agendadas`, `configuracoes` |
| Integrações | `/api/claude` (Anthropic via Nginx) — via AIAnalysisButton |
| Polling/Realtime | `staleTime` padrão React Query (sem realtime) |
| Observações | Dupla perspectiva de data: `data_entrada` (marketing) e `data_fechamento` (financeiro) |

### `/admin/comercial` — Vendas

| Camada | Item |
|--------|------|
| Componentes | `AppSidebar`, `TopNav` (Dialog/Sheet inline) |
| Hooks | `useQuery`, `useMutation` (inline) |
| Tabelas (leitura/escrita) | `vendas` (CRUD completo), `configuracoes` (lista de funis/produtos/origens) |
| Integrações | `sendToWebhook` — webhook externo (RD Station CRM / N8N) ao criar/atualizar venda |
| Polling/Realtime | Nenhum |

### `/funil` — FunilXPTO

| Camada | Item |
|--------|------|
| Componentes | `AIAnalysisButton`, `AppSidebar`, `TopNav` |
| Hooks | `useQuery` (inline múltiplos) |
| Tabelas (leitura) | `vendas`, `leads_diarios_por_funil`, `leads_geografia`, `reunioes_agendadas`, `propostas_crm` |
| Integrações | `/api/claude` via AIAnalysisButton |
| Constantes hardcoded | `METAS` (benchmarks por funil — ver seção Benchmarks abaixo) |

### `/live` — CSLive

| Camada | Item |
|--------|------|
| Componentes | `WorldToBrazilMap` |
| Hooks | `useQuery` (inline), Supabase Realtime subscription |
| Tabelas (leitura) | `vendas`, `leads_diarios_por_funil`, `metas` (via `configuracoes`?) |
| Integrações | Supabase Realtime `postgres_changes` na tabela `vendas` |
| Assets | `sounds/applause.mp3`, `sounds/celebracao_meta.mp3`, `canvas-confetti` |
| Dev-only | Botões "Testar comemoração" e "Testar meta batida" (ocultos em produção via `import.meta.env.DEV`) |

### `/marketing` — MarketingDashboard

| Camada | Item |
|--------|------|
| Componentes | `MarketingSection` (monolito 2118 linhas), `EmailMarketingSection`, `AppSidebar`, `TopNav` |
| Hooks | `useInstagramInsights`, `useQuery` (inline) |
| Tabelas (leitura) | Tabelas do schema `wpp` (via `wppClient`): tabelas de campanhas WPP/email |
| Integrações | Meta Ads API (via `wppClient`/Supabase wpp schema), Instagram Graph API |
| Observações | **NÃO ALTERAR** — componente sensível conforme instrução do projeto |

### `/mapa` — MapaGeografico

| Camada | Item |
|--------|------|
| Componentes | `WorldToBrazilMap` |
| Hooks | `useLeadsGeografia` |
| Tabelas (leitura) | `leads_geografia` |
| Assets | `geo/br-states.json`, `geo/world-countries.json` |
| Libs | `d3-geo`, `topojson-client` (SVG client-side) |

### `/metas` — Metas

| Camada | Item |
|--------|------|
| Componentes | `MetasModal`, `AppSidebar`, `TopNav` |
| Hooks | `useQuery` (inline) |
| Tabelas (leitura/escrita) | `configuracoes` (metas armazenadas por funil/período) |

### `/input-diario` — InputDiário

| Camada | Item |
|--------|------|
| Componentes | `AppSidebar`, `TopNav` |
| Hooks | `useQuery`, `useMutation` (inline) |
| Tabelas (leitura/escrita) | `metricas_diarias` (CRUD), `sdrs`, `configuracoes` |
| Observações | **NÃO REMOVER** — fonte primária de `metricas_diarias` |

### `/safras` — GestaoSafras

| Camada | Item |
|--------|------|
| Componentes | `AppSidebar`, `TopNav` |
| Hooks | `useQuery` (inline) |
| Tabelas (leitura) | `metricas_diarias` (visão de calendário/safras) |
| Observações | **NÃO REMOVER** — consumidor de `metricas_diarias` |

### `/admin/custos` — CustosMarketing

| Camada | Item |
|--------|------|
| Tabelas (leitura/escrita) | `custos_marketing` |

### `/admin/sdrs` — SDRs (via Configuracoes ou PerformanceSDR)

| Camada | Item |
|--------|------|
| Tabelas (leitura/escrita) | `sdrs`, `deals_sdr_tracking`, `tasks_sdr_tracking` |
| Hooks | `useSDRs` |
| Constantes hardcoded | `DIAS_ESFRIANDO = 3` em `src/hooks/useSDRs.ts` |

### `/admin/usuarios` — Usuários (admin)

| Camada | Item |
|--------|------|
| Integrações | `/api/admin/criar-usuario` → Nginx proxy → N8N webhook (autenticado server-side) |
| Observações | Secret `N8N_ADMIN_SECRET` movido para server-side na FASE 0 |

### `/configuracoes` — Configurações

| Camada | Item |
|--------|------|
| Tabelas (leitura/escrita) | `configuracoes`, `sdrs` |

---

## Consumidores de `metricas_diarias`

| Página/Componente | Operação | Colunas utilizadas |
|-------------------|----------|-------------------|
| `InputDiário` | **READ + WRITE** (CRUD) | todas |
| `GestaoSafras` | **READ** (calendário) | `data`, `funil`, `leads_recebidos`, `reunioes_agendadas`, `compareceram_real` |
| `Dashboard (Index)` | indiretamente via `LeadsDiariosCard` | — |

**Tabela `metricas_diarias` NÃO pode ser removida** — é escrita pelo InputDiário e lida pelo GestaoSafras e possivelmente por cards do Dashboard.

---

## Tabelas populadas pelo N8N (somente leitura pelo frontend)

| Tabela | Descrição |
|--------|-----------|
| `leads_diarios_por_funil` | Contagem diária de leads por `pipeline_id`, incrementada/decrementada pelo N8N via webhooks do RD Station |
| `leads_geografia` | Localização geográfica dos leads (estado, cidade, país), populada pelo N8N |
| `reunioes_agendadas` | Registro de reuniões por data com flag `compareceu`, populado via N8N/RD Station |
| `propostas_crm` | Propostas enviadas via CRM (RD Station), populadas via N8N |

---

## Benchmarks Hardcoded

### `src/pages/FunilXPTO.tsx` — objeto `METAS`

```ts
// Localização: src/pages/FunilXPTO.tsx (aprox. linhas 40–70)
const METAS = {
  agendamento: 35,   // % de leads → reunião agendada
  showup:      70,   // % de agendados → compareceram
  conversao:   70,   // % de show-ups → fechados
  proposta:    70,   // % de reuniões → proposta enviada
  renovacao:   30,   // % do total → renovação
};
```

### `src/pages/Index.tsx` — benchmarks de insights automáticos

Mesmos valores (35%, 70%, 70%, 70%, 30%) utilizados na geração de insights automáticos com `AIAnalysisButton`.

### `src/hooks/useSDRs.ts`

```ts
const DIAS_ESFRIANDO = 3; // dias sem atividade para considerar lead "esfriando"
```

---

## Integrações Externas

| Integração | Sentido | Autenticação | Localização |
|------------|---------|-------------|-------------|
| Supabase (main) | R/W | `VITE_SUPABASE_PUBLISHABLE_KEY` + Supabase Auth | `src/integrations/supabase/client.ts` |
| Supabase (wpp schema) | R | mesmas credenciais | `src/integrations/supabase/wppClient.ts` |
| Anthropic Claude | W (proxy) | `ANTHROPIC_KEY` via Nginx (server-side) | Dockerfile → `/api/claude` |
| N8N webhook (criar usuário) | W (proxy) | `N8N_ADMIN_SECRET` via Nginx (server-side) | Dockerfile → `/api/admin/criar-usuario` |
| Meta Ads / Instagram | R | via Supabase wpp schema | `src/components/MarketingSection.tsx`, `useInstagramInsights.ts` |
| RD Station CRM | W | `sendToWebhook` (frontend direto) | `src/pages/Vendas.tsx` |
| N8N automações | R/W | N8N-side (popula tabelas) | externo ao repositório |

---

## Rotas e Proteção

| Rota | Componente | Protegida |
|------|-----------|-----------|
| `/` | Index | Não |
| `/funil` | FunilXPTO | Não |
| `/live` | CSLive | Não |
| `/marketing` | MarketingDashboard | Não |
| `/mapa` | MapaGeografico | Não |
| `/metas` | Metas | Não |
| `/admin/comercial` | Vendas | **Sim** |
| `/admin/custos` | CustosMarketing | **Sim** |
| `/admin/sdrs` | (Configuracoes?) | **Sim** |
| `/admin/usuarios` | Usuarios | **Sim** |
| `/configuracoes` | Configuracoes | **Sim** |
| `/input-diario` | InputDiario | **Sim** |
| `/safras` | GestaoSafras | **Sim** |
| `/login` | Login | Não |
| `/reset-password` | ResetPassword | Não |

> **Atenção:** `src/pages/Reunioes.tsx` existe no projeto mas **não tem rota registrada** em `App.tsx`.

---

## Dívida Técnica Identificada (FASE 0)

| Item | Arquivo | Severidade |
|------|---------|-----------|
| `sdrs` declarado duas vezes em types.ts | `src/integrations/supabase/types.ts` | Baixa |
| `MarketingSection.tsx` com 2118 linhas | `src/components/MarketingSection.tsx` | Média |
| `SDRPodium` comentado em Index.tsx linha ~717 | `src/pages/Index.tsx` | Baixa |
| `Reunioes.tsx` sem rota registrada | `src/pages/Reunioes.tsx` + `src/App.tsx` | Baixa |
| `sendToWebhook` em Vendas.tsx chama webhook externo diretamente do frontend | `src/pages/Vendas.tsx` | Média |
