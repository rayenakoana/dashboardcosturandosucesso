-- Reset pontual: zera status_andamento_em de todos os deals sincronizados antes
-- do trigger trg_set_status_andamento_em existir, pra evitar métrica inflada
-- de "tempo médio 1º contato" (ver migration 20260811170000+ pro trigger).
update deals_sdr_tracking
set status_andamento_em = null;
