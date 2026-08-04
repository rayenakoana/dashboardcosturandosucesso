-- Soft delete: quando um deal é excluído no RD CRM, marcamos como deletado em vez de apagar
-- (preserva histórico/auditoria; o dashboard passa a filtrar deletado = false em todo lugar)
ALTER TABLE leads_geografia ADD COLUMN IF NOT EXISTS deletado boolean NOT NULL DEFAULT false;

-- Índice para a busca por deal_id feita no momento da exclusão (webhook crm_deal_deleted)
CREATE INDEX IF NOT EXISTS idx_leads_geografia_deal_id ON leads_geografia (deal_id);

-- Função para decrementar em 1 o total_leads (e, se aplicável, total_leads_pagos) de um dia/funil,
-- sem deixar o contador ficar negativo. Chamada pelo N8N quando um lead excluído é identificado.
CREATE OR REPLACE FUNCTION decrementar_lead_diario(
  p_data date,
  p_pipeline_id text,
  p_era_pago boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE leads_diarios_por_funil
  SET
    total_leads = GREATEST(total_leads - 1, 0),
    total_leads_pagos = CASE WHEN p_era_pago THEN GREATEST(COALESCE(total_leads_pagos, 0) - 1, 0) ELSE total_leads_pagos END,
    updated_at = now()
  WHERE data = p_data AND pipeline_id = p_pipeline_id;
END;
$$;
