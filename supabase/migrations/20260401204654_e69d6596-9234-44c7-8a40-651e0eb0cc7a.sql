
CREATE TABLE public.metricas_diarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  funil TEXT NOT NULL,
  leads_recebidos INTEGER NOT NULL DEFAULT 0,
  leads_qualificados INTEGER NOT NULL DEFAULT 0,
  reunioes_agendadas INTEGER NOT NULL DEFAULT 0,
  reunioes_confirmadas INTEGER NOT NULL DEFAULT 0,
  compareceram_real INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(data, funil)
);

ALTER TABLE public.metricas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all select" ON public.metricas_diarias FOR SELECT USING (rls_allow_all());
CREATE POLICY "Allow all insert" ON public.metricas_diarias FOR INSERT WITH CHECK (rls_allow_all());
CREATE POLICY "Allow all update" ON public.metricas_diarias FOR UPDATE USING (rls_allow_all());
CREATE POLICY "Allow all delete" ON public.metricas_diarias FOR DELETE USING (rls_allow_all());
