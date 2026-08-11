-- Remove a FK entre tasks_sdr_tracking e deals_sdr_tracking: tarefas podem
-- referenciar deals que ainda não foram sincronizados (ex: deals antigos).
alter table tasks_sdr_tracking drop constraint if exists tasks_sdr_tracking_deal_id_fkey;
