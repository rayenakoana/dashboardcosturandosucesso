-- ============================================
-- Migration: SDR tracking
-- Rodar no SQL Editor do Supabase (projeto syecwttpsvrmhdvinjmt)
-- ============================================

-- 1. Tabela de cadastro dos SDRs
create table if not exists sdrs (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  foto_url text,
  rd_user_id text unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tracking de deals por SDR (populado via N8N a partir dos webhooks do RD Station)
create table if not exists deals_sdr_tracking (
  deal_id text primary key,
  rd_user_id text not null,
  status text not null,           -- 'Nova' | 'Em andamento' | 'Fechado' | 'Perdido' (ou equivalente do RD)
  rating int,
  funil text,
  criado_em timestamptz,
  status_andamento_em timestamptz, -- quando o deal saiu de 'Nova' pra 'Em andamento'
  ultima_atividade_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_deals_sdr_tracking_user on deals_sdr_tracking (rd_user_id);
create index if not exists idx_deals_sdr_tracking_funil on deals_sdr_tracking (funil);
create index if not exists idx_deals_sdr_tracking_status on deals_sdr_tracking (status);

-- 3. Tracking de tarefas por SDR (populado via N8N a partir do RD Station)
create table if not exists tasks_sdr_tracking (
  task_id text primary key,
  deal_id text references deals_sdr_tracking(deal_id) on delete cascade,
  rd_user_id text not null,
  status text not null,          -- 'concluida' | 'agendada'
  data_agendada timestamptz,
  data_conclusao timestamptz,
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_tasks_sdr_tracking_user on tasks_sdr_tracking (rd_user_id);
create index if not exists idx_tasks_sdr_tracking_status on tasks_sdr_tracking (status);

-- 4. RLS (mesmo padrão permissivo já usado no projeto)
alter table sdrs enable row level security;
alter table deals_sdr_tracking enable row level security;
alter table tasks_sdr_tracking enable row level security;

drop policy if exists rls_allow_all_sdrs on sdrs;
create policy rls_allow_all_sdrs on sdrs for all using (true) with check (true);

drop policy if exists rls_allow_all_deals_sdr_tracking on deals_sdr_tracking;
create policy rls_allow_all_deals_sdr_tracking on deals_sdr_tracking for all using (true) with check (true);

drop policy if exists rls_allow_all_tasks_sdr_tracking on tasks_sdr_tracking;
create policy rls_allow_all_tasks_sdr_tracking on tasks_sdr_tracking for all using (true) with check (true);

-- 5. Storage bucket pra fotos dos SDRs (rodar só se o bucket ainda não existir)
insert into storage.buckets (id, name, public)
values ('sdr-fotos', 'sdr-fotos', true)
on conflict (id) do nothing;
