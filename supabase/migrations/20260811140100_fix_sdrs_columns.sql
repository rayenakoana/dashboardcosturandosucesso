-- Rodar no SQL Editor do Supabase — garante que a tabela sdrs tem todas as colunas necessárias,
-- mesmo se ela já existia antes com um schema mais antigo.

alter table sdrs add column if not exists rd_user_id text;
alter table sdrs add column if not exists updated_at timestamptz not null default now();

-- Garante unicidade do vínculo com RD Station (evita dois SDRs apontando pro mesmo usuário)
create unique index if not exists sdrs_rd_user_id_key on sdrs (rd_user_id) where rd_user_id is not null;

-- Confirma o schema final
select column_name, data_type
from information_schema.columns
where table_name = 'sdrs'
order by ordinal_position;
