-- Adiciona controle de visibilidade por item de configuração (usado para mostrar/ocultar funis no dashboard)
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;

-- Cadastra o novo funil Supplytex (pipeline_id 699f332c5c43de0019d4f9ef no RD CRM)
INSERT INTO configuracoes (tipo, valor, visivel)
SELECT 'Funil', 'Supplytex', true
WHERE NOT EXISTS (
  SELECT 1 FROM configuracoes WHERE tipo = 'Funil' AND valor = 'Supplytex'
);

-- Oculta o UniForce temporariamente (mantém histórico e configuração, só some da UI)
UPDATE configuracoes SET visivel = false WHERE tipo = 'Funil' AND valor = 'UniForce';
