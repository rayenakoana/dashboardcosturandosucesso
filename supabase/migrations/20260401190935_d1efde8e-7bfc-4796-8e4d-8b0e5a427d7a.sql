
-- Helper function for open RLS
CREATE OR REPLACE FUNCTION public.rls_allow_all()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true
$$;

-- Configuracoes table
CREATE TABLE public.configuracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select" ON public.configuracoes FOR SELECT USING (rls_allow_all());
CREATE POLICY "Allow all insert" ON public.configuracoes FOR INSERT WITH CHECK (rls_allow_all());
CREATE POLICY "Allow all update" ON public.configuracoes FOR UPDATE USING (rls_allow_all());
CREATE POLICY "Allow all delete" ON public.configuracoes FOR DELETE USING (rls_allow_all());

-- Vendas table
CREATE TABLE public.vendas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_cliente TEXT NOT NULL,
  segmento TEXT,
  produto TEXT,
  funil TEXT,
  origem TEXT,
  campanha TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Lead',
  motivo_perda TEXT,
  is_renovacao BOOLEAN NOT NULL DEFAULT false,
  data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fechamento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select" ON public.vendas FOR SELECT USING (rls_allow_all());
CREATE POLICY "Allow all insert" ON public.vendas FOR INSERT WITH CHECK (rls_allow_all());
CREATE POLICY "Allow all update" ON public.vendas FOR UPDATE USING (rls_allow_all());
CREATE POLICY "Allow all delete" ON public.vendas FOR DELETE USING (rls_allow_all());

-- Custos Marketing table
CREATE TABLE public.custos_marketing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT NOT NULL,
  nome_item TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_marketing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select" ON public.custos_marketing FOR SELECT USING (rls_allow_all());
CREATE POLICY "Allow all insert" ON public.custos_marketing FOR INSERT WITH CHECK (rls_allow_all());
CREATE POLICY "Allow all update" ON public.custos_marketing FOR UPDATE USING (rls_allow_all());
CREATE POLICY "Allow all delete" ON public.custos_marketing FOR DELETE USING (rls_allow_all());

-- Performance Reunioes table
CREATE TABLE public.performance_reunioes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  sdr_estimado INTEGER NOT NULL DEFAULT 0,
  sdr_confirmado INTEGER NOT NULL DEFAULT 0,
  compareceram_real INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_reunioes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select" ON public.performance_reunioes FOR SELECT USING (rls_allow_all());
CREATE POLICY "Allow all insert" ON public.performance_reunioes FOR INSERT WITH CHECK (rls_allow_all());
CREATE POLICY "Allow all update" ON public.performance_reunioes FOR UPDATE USING (rls_allow_all());
CREATE POLICY "Allow all delete" ON public.performance_reunioes FOR DELETE USING (rls_allow_all());
