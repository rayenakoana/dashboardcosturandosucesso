-- Tabela sdrs (equipe de SDRs, com foto para o pódio de performance)
CREATE TABLE public.sdrs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sdrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select" ON public.sdrs FOR SELECT USING (rls_allow_all());
CREATE POLICY "Allow all insert" ON public.sdrs FOR INSERT WITH CHECK (rls_allow_all());
CREATE POLICY "Allow all update" ON public.sdrs FOR UPDATE USING (rls_allow_all());
CREATE POLICY "Allow all delete" ON public.sdrs FOR DELETE USING (rls_allow_all());

-- Vincula metricas_diarias ao SDR responsavel
ALTER TABLE public.metricas_diarias ADD COLUMN sdr_id UUID REFERENCES public.sdrs(id);
CREATE INDEX idx_metricas_diarias_sdr_id ON public.metricas_diarias(sdr_id);

-- Habilita Realtime na tabela vendas (necessario para o CS Dash Live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas;
