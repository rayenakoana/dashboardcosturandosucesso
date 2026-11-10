import { VinculosHistoricoExecutivoV32 } from "@/components/VinculosHistoricoExecutivoV32";
import { CsDatePicker } from "@/components/CsDatePicker";
import { DinamicaLeadsExecutivaV1 } from "@/components/DinamicaLeadsExecutivaV1";
import { obterEstadoResultadoV65 } from "@/components/ResultadosTendenciaV44";
import { ResultadosTendenciaV44 } from "@/components/ResultadosTendenciaV44";
import "@/styles/visaoExecutivaMobileV29.css";
// cs-dash-mobile-executivo-v2-9
import "@/styles/inteligenciaCardsV24.css";
import "@/styles/visaoGeralTopoExecutivoV28.css";
import "@/styles/visaoGeralVisaoUnificadaV29.css";
import "@/styles/visaoGeralPerformanceDinamicaV210.css";
import "@/styles/csOverviewHeaderV32.css";
import "@/styles/csIntelligencePrototypeV34.css";
import "@/styles/csResultsPrototypeV41.css";
import "@/styles/csResultsTrendV44.css";
import "@/styles/csEtapasPeriodoV1.css";
import "@/styles/csBarrasExecutivasV1.css";
import "@/styles/csResultadosResponsivoV2.css";
import { SaudeCarteiraComercialV14 } from "@/components/SaudeCarteiraComercialV14";
import { useMemo as useVinculosMemo, useEffect as useVinculosEffect, useRef as useVinculosRef } from "react";
import { relacionarEventosComerciais } from "@/lib/vinculosComerciaisPorDeal";
import { ResumoGeoExecutivoV53, ResumoMetaExecutivoV53 } from "@/components/DestaquesExecutivosV53";
import { ResumoFunilExecutivo } from "@/components/ResumoFunilExecutivo";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/KPICard";
import { GlassCard } from "@/components/GlassCard";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";
import { SDRPodium } from "@/components/SDRPodium";
import { MetaXVendidoFunil } from "@/components/MetaXVendidoFunil";
import { LeadsDiariosCard } from "@/components/LeadsDiariosCard";
import { useVendas } from "@/hooks/useVendas";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { usePerformanceReunioes } from "@/hooks/usePerformanceReunioes";
import { useMetricasDiarias } from "@/hooks/useMetricasDiarias";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { PIPELINE_IDS } from "@/lib/funis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, Target, TrendingUp, Clock, BadgeDollarSign,
  Users, BarChart3, PieChart as PieChartIcon, AlertTriangle, CalendarCheck, Percent,
  RefreshCw, ShoppingCart, Filter, MapPin,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area,
} from "recharts";


// cs-formatacao-br-v1
const formatarMoedaCS = (valor: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(valor);

const formatarPctCS = (
  valor: number,
  casas = 1
): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  }).format(valor) + "%";

const COLORS = ["#C8102E", "#E8384F", "#FF6B6B", "#FF8E8E", "#FFB4B4", "#991B1B", "#FCA5A5"];

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "month", label: "Este Mês" },
  { value: "quarter", label: "Trimestre" },
  { value: "custom", label: "Personalizado" },
  { value: "all", label: "Tudo" },
];

function getDateRange(period: string, customStart: string, customEnd: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (period === "all") return { start: "2000-01-01", end: "2099-12-31" };
  if (period === "today") return { start: today, end: today };
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return { start, end: today };
  }
  if (period === "quarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qMonth, 1).toISOString().split("T")[0];
    return { start, end: today };
  }
  return { start: customStart || "2000-01-01", end: customEnd || "2099-12-31" };
}

const tooltipStyle = { background: "#111", border: "1px solid hsl(0 0% 12%)", borderRadius: "8px", fontSize: 12 };

function PieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ ...tooltipStyle, padding: "8px 12px", whiteSpace: "nowrap" }}>
      <div style={{ color: "#fff", fontWeight: 600 }}>{name}</div>
      <div style={{ color: "#ccc" }}>{value} leads</div>
    </div>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3" style={{ height }}>
      <div className="flex items-end gap-2 h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function Index() {
  const { data: vendas = [], isLoading: loadingVendas } = useVendas();
  const { data: custos = [], isLoading: loadingCustos } = useCustosMarketing();
  const { data: reunioes = [], isLoading: loadingReunioes } = usePerformanceReunioes();
  const { data: metricasDiarias = [], isLoading: loadingMetricas } = useMetricasDiarias();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { data: produtos = [] } = useConfiguracoes("Produto");
  const { data: campanhas = [] } = useConfiguracoes("Campanha");
  const { data: origens = [] } = useConfiguracoes("Origem");
  const { data: metaVendaGeralCfg = [] } = useConfiguracoes("Meta Venda Geral");
  const { data: metaRenovacaoCfg = [] } = useConfiguracoes("Meta Renovação");
  const { data: metaVolumeCfg = [] } = useConfiguracoes("Meta Volume Vendas");

  const [period, setPeriod] = useState("month");
  const [insightsExpandidos, setInsightsExpandidos] = useState(false);

  const [inteligenciaSelecionada, setInteligenciaSelecionada] =
    useState<
      "meta" | "perdas" | "produto" | "segmento" |
      "conversoes" | "showup" | "funil" | null
    >(null);

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const toggleFunil = (nome: string) => {
    setFilterFunis(prev => prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]);
  };
  const [filterProduto, setFilterProduto] = useState("Todos");
  const [filterCampanha, setFilterCampanha] = useState("Todos");
  const [filterOrigem, setFilterOrigem] = useState("Todos");
  const [excludeRenovacao, setExcludeRenovacao] = useState(false);
  const filtrosPainelCount = [
    period !== "month",
    filterProduto !== "Todos",
    filterCampanha !== "Todos",
    filterOrigem !== "Todos",
    excludeRenovacao,
  ].filter(Boolean).length;

  const { start, end } = getDateRange(period, customStart, customEnd);

  const pipelineIdsFiltrados = filterFunis.map(f => PIPELINE_IDS[f]).filter(Boolean);
  const todosFunisSelecionados = filterFunis.length === 0;


  // cs-overview-funil-resumo-v4
  // Propostas no mesmo periodo/funis da Visao Geral.
  const {
    data: propostasResumoRaw = [],
    isLoading: loadingPropostasResumo,
    isFetching: fetchingPropostasV12,
    isError: erroPropostasV12,
    error: detalheErroPropostasV12,
  } = useQuery({
    queryKey: [
      "overview_propostas_resumo_v4",
      start,
      end,
      filterFunis,
    ],
    queryFn: async () => {
      if (
        !todosFunisSelecionados &&
        pipelineIdsFiltrados.length === 0
      ) {
        return [];
      }

      let q = supabase
        .from("propostas_crm")
        .select("deal_id, pipeline_id")
        .gte("data", start)
        .lte("data", end);

      if (!todosFunisSelecionados) {
        q = q.in("pipeline_id", pipelineIdsFiltrados);
      }

      // cs-overview-paginacao-v4-3
      // Preserva os filtros da consulta e busca todas as paginas.
      const registros: any[] = [];
      const tamanhoPagina = 1000;
      let inicioPagina = 0;

      while (true) {
        const { data, error } = await q.range(
          inicioPagina,
          inicioPagina + tamanhoPagina - 1
        );

        if (error) throw error;
        if (!data || data.length === 0) break;

        registros.push(...data);

        if (data.length < tamanhoPagina) break;
        inicioPagina += tamanhoPagina;
      }

      return registros;
    },
  });

  const {
    data: mqlDiarioRaw = [],
    isLoading: loadingMqlDiario,
    isFetching: fetchingMqlV12,
    isError: erroMqlV12,
    error: detalheErroMqlV12,
  } = useQuery({
    queryKey: ["ritmo_mql_diario", start, end, filterFunis],
    queryFn: async () => {
      let q = supabase
        .from("leads_geografia")
        .select("deal_id, created_at, pipeline_id")
        .eq("deletado", false)
        .in("rating", [3, 5])
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59");
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      // cs-overview-paginacao-v4-3
      // Preserva os filtros da consulta e busca todas as paginas.
      const registros: any[] = [];
      const tamanhoPagina = 1000;
      let inicioPagina = 0;

      while (true) {
        const { data, error } = await q.range(
          inicioPagina,
          inicioPagina + tamanhoPagina - 1
        );

        if (error) throw error;
        if (!data || data.length === 0) break;

        registros.push(...data);

        if (data.length < tamanhoPagina) break;
        inicioPagina += tamanhoPagina;
      }

      return registros;
    },
  });


  // cs-dash-vinculos-comerciais-v1-2
  // Diagnostico apenas em memoria, sem alterar indicadores.
  const diagnosticoVinculosV11 = useVinculosMemo(() => {
    return relacionarEventosComerciais(
      mqlDiarioRaw.map(r => ({
        deal_id: r.deal_id,
        pipeline_id: r.pipeline_id,
      })),
      propostasResumoRaw.map(r => ({
        deal_id: r.deal_id,
        pipeline_id: r.pipeline_id,
      }))
    );
  }, [mqlDiarioRaw, propostasResumoRaw]);

  // Evita imprimir a mesma fotografia repetidamente.
  const ultimaFotografiaV12 = useVinculosRef<string>("");

  useVinculosEffect(() => {
    if (!import.meta.env.DEV) return;
    if (
      new URLSearchParams(window.location.search)
        .get("csdebug") !== "vinculos"
    ) return;

    // Nao publica contagens parciais como resultados finais.
    if (
      loadingMqlDiario || loadingPropostasResumo ||
      fetchingMqlV12 || fetchingPropostasV12
    ) return;

    const funisDiagnostico = [...filterFunis].sort().join("|");

    if (erroMqlV12 || erroPropostasV12) {
      const falhas = [
        erroMqlV12 ? "MQL" : "",
        erroPropostasV12 ? "Propostas" : "",
      ].filter(Boolean).join(", ");

      const chaveErro = [
        start, end, funisDiagnostico, "erro", falhas
      ].join("|");

      if (ultimaFotografiaV12.current === chaveErro) return;
      ultimaFotografiaV12.current = chaveErro;

      console.warn(
        "CS DASH - VINCULOS V1.2: consulta com erro",
        {
          fontes: falhas,
          erroMql: erroMqlV12
            ? String(detalheErroMqlV12) : null,
          erroPropostas: erroPropostasV12
            ? String(detalheErroPropostasV12) : null,
        }
      );
      return;
    }

    const resultado = diagnosticoVinculosV11;

    const fotografia = [
      start,
      end,
      funisDiagnostico,
      mqlDiarioRaw.length,
      propostasResumoRaw.length,
      resultado.totalMqlUnicos,
      resultado.totalPropostasUnicas,
      resultado.oportunidadesEmAmbasFontes,
      resultado.divergenciasFunil,
    ].join("|");

    if (ultimaFotografiaV12.current === fotografia) return;
    ultimaFotografiaV12.current = fotografia;

    console.info(
      "CS DASH - VINCULOS COMERCIAIS V1.2 - CONSULTAS CONCLUIDAS"
    );

    console.table([{
      periodo: `${start} a ${end}`,
      funis: funisDiagnostico || "Todos",
      registrosMql: mqlDiarioRaw.length,
      registrosPropostas: propostasResumoRaw.length,
      mqlUnicos: resultado.totalMqlUnicos,
      propostasUnicas: resultado.totalPropostasUnicas,
      presentesNasDuasFontes:
        resultado.oportunidadesEmAmbasFontes,
      mqlSemPropostaNoRecorte:
        resultado.mqlSemPropostaNoRecorte,
      propostasSemMqlNoRecorte:
        resultado.propostasSemMqlNoRecorte,
      divergenciasFunil:
        resultado.divergenciasFunil,
    }]);
  }, [
    diagnosticoVinculosV11,
    mqlDiarioRaw,
    propostasResumoRaw,
    loadingMqlDiario,
    loadingPropostasResumo,
    fetchingMqlV12,
    fetchingPropostasV12,
    erroMqlV12,
    erroPropostasV12,
    detalheErroMqlV12,
    detalheErroPropostasV12,
    filterFunis,
    start,
    end,
  ]);

  const { data: reunioesDiarioRaw = [], isLoading: loadingReunioesDiario } = useQuery({
    queryKey: ["ritmo_reunioes_diario", start, end, filterFunis],
    queryFn: async () => {
      let q = supabase
        .from("reunioes_agendadas")
        .select("data, pipeline_id, compareceu")
        .gte("data", start)
        .lte("data", end);
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      // cs-overview-paginacao-v4-3
      // Preserva os filtros da consulta e busca todas as paginas.
      const registros: any[] = [];
      const tamanhoPagina = 1000;
      let inicioPagina = 0;

      while (true) {
        const { data, error } = await q.range(
          inicioPagina,
          inicioPagina + tamanhoPagina - 1
        );

        if (error) throw error;
        if (!data || data.length === 0) break;

        registros.push(...data);

        if (data.length < tamanhoPagina) break;
        inicioPagina += tamanhoPagina;
      }

      return registros;
    },
  });

  const { data: leadsDiarioRaw = [], isLoading: loadingLeadsDiario } = useQuery({
    queryKey: ["ritmo_leads_diario", start, end, filterFunis],
    queryFn: async () => {
      let q = supabase
        .from("leads_diarios_por_funil")
        .select("total_leads, total_leads_pagos, pipeline_id")
        .gte("data", start)
        .lte("data", end);
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      // cs-overview-paginacao-v4-3
      // Preserva os filtros da consulta e busca todas as paginas.
      const registros: any[] = [];
      const tamanhoPagina = 1000;
      let inicioPagina = 0;

      while (true) {
        const { data, error } = await q.range(
          inicioPagina,
          inicioPagina + tamanhoPagina - 1
        );

        if (error) throw error;
        if (!data || data.length === 0) break;

        registros.push(...data);

        if (data.length < tamanhoPagina) break;
        inicioPagina += tamanhoPagina;
      }

      return registros;
    },
  });

  const isLoading = loadingVendas || loadingCustos || loadingReunioes || loadingMetricas || loadingMqlDiario || loadingReunioesDiario || loadingLeadsDiario;

  // Vendas filtradas por data_entrada (visão de Safra / Marketing)
  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (v.data_entrada < start || v.data_entrada > end) return false;
      if (filterFunis.length > 0 && !filterFunis.includes(v.funil)) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, start, end, filterFunis, filterProduto, filterCampanha, filterOrigem]);

  // Vendas filtradas por data_fechamento (visão Financeira / Faturamento)
  const vendasFechamentoNoPeriodo = useMemo(() => {
    return vendas.filter(v => {
      if (!v.data_fechamento) return false;
      if (v.data_fechamento < start || v.data_fechamento > end) return false;
      if (v.status !== "Fechado") return false;
      if (filterFunis.length > 0 && !filterFunis.includes(v.funil)) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, start, end, filterFunis, filterProduto, filterCampanha, filterOrigem]);

  const filteredCustos = useMemo(() => custos.filter(c => {
    if (c.data < start || c.data > end) return false;
    if (filterFunis.length > 0 && !filterFunis.map(f => f.toUpperCase()).includes((c.produto || "").toUpperCase())) return false;
    return true;
  }), [custos, start, end, filterFunis]);
  const filteredReunioes = useMemo(() => reunioes.filter(r => r.data >= start && r.data <= end), [reunioes, start, end]);

  const filteredMetricas = useMemo(() => {
    return metricasDiarias.filter(m => {
      if (m.data < start || m.data > end) return false;
      if (filterFunis.length > 0 && !filterFunis.includes(m.funil)) return false;
      return true;
    });
  }, [metricasDiarias, start, end, filterFunis]);

  // === KPIs Financeiros (por data_fechamento) ===

  // cs-results-trend-v44: intervalo anterior de igual duracao.
  const { comparacaoInicioV44, comparacaoFimV44 } = useMemo(() => {
    const primeiro = Date.parse(`${start}T12:00:00Z`);
    const ultimo = Date.parse(`${end}T12:00:00Z`);

    if (!Number.isFinite(primeiro) ||
        !Number.isFinite(ultimo) || ultimo < primeiro) {
      return { comparacaoInicioV44: "", comparacaoFimV44: "" };
    }

    const diaMs = 86400000;
    const dias = Math.round((ultimo - primeiro) / diaMs) + 1;
    const iso = (ms: number) =>
      new Date(ms).toISOString().slice(0, 10);

    return {
      comparacaoInicioV44: iso(primeiro - dias * diaMs),
      comparacaoFimV44: iso(primeiro - diaMs),
    };
  }, [start, end]);

  const vendasComparacaoAnteriorV44 = useMemo(() => {
    return vendas.filter(v => {
      if (!v.data_fechamento) return false;
      if (v.data_fechamento < comparacaoInicioV44 || v.data_fechamento > comparacaoFimV44) return false;
      if (v.status !== "Fechado") return false;
      if (filterFunis.length > 0 && !filterFunis.includes(v.funil)) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, comparacaoInicioV44, comparacaoFimV44, filterFunis, filterProduto, filterCampanha, filterOrigem]);

  const vendasParaFaturamento = excludeRenovacao
    ? vendasFechamentoNoPeriodo.filter(v => !v.is_renovacao)
    : vendasFechamentoNoPeriodo;
  const faturamento = vendasParaFaturamento.reduce((s, v) => s + Number(v.valor), 0);
  const faturamentoRenovacao = vendasFechamentoNoPeriodo.filter(v => v.is_renovacao).reduce((s, v) => s + Number(v.valor), 0);
  const pctReceitaRenovacao = (faturamento + (excludeRenovacao ? faturamentoRenovacao : 0)) > 0
    ? (faturamentoRenovacao / (faturamento + (excludeRenovacao ? faturamentoRenovacao : 0))) * 100
    : 0;
  const ticketMedio = vendasParaFaturamento.length > 0 ? faturamento / vendasParaFaturamento.length : 0;

  const tempoMedio = useMemo(() => {
    const with2dates = vendasFechamentoNoPeriodo.filter(v => v.data_entrada && v.data_fechamento);
    if (with2dates.length === 0) return 0;
    const total = with2dates.reduce((s, v) => {
      const d1 = new Date(v.data_entrada).getTime();
      const d2 = new Date(v.data_fechamento!).getTime();
      return s + Math.max(0, (d2 - d1) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(total / with2dates.length);
  }, [vendasFechamentoNoPeriodo]);

  // === KPIs de Marketing (por data_entrada / Safra) ===
  const fechadasSafra = filteredVendas.filter(v => v.status === "Fechado" && v.data_fechamento);

  // === KPIs automáticos (RD CRM + Google Calendar) ===
  const totalLeadsDiarios = leadsDiarioRaw.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
  const totalLeadsPagos = leadsDiarioRaw.reduce((s: number, r: any) => s + (r.total_leads_pagos || 0), 0);
  const totalMQLDiarios = mqlDiarioRaw.length;
  const totalAgendadas = reunioesDiarioRaw.length;
  const totalCompareceramDiarios = reunioesDiarioRaw.filter((r: any) => r.compareceu).length;
  const pctAgendamento = totalMQLDiarios > 0 ? (totalAgendadas / totalMQLDiarios) * 100 : 0;
  const pctShowUpDiario = totalAgendadas > 0 ? (totalCompareceramDiarios / totalAgendadas) * 100 : 0;
  const pctLeadVenda = totalLeadsDiarios > 0 ? (fechadasSafra.length / totalLeadsDiarios) * 100 : 0;

  // === KPIs de Eficiência ===
  const totalCustosAds = filteredCustos.filter(c => c.categoria === "Ads").reduce((s, c) => s + Number(c.valor), 0);
  const totalCustos = filteredCustos.reduce((s, c) => s + Number(c.valor), 0);
  const totalLeads = filteredVendas.length;
  const cpl = totalLeadsPagos > 0 ? totalCustosAds / totalLeadsPagos : 0;
  const cac = vendasFechamentoNoPeriodo.length > 0 ? totalCustosAds / vendasFechamentoNoPeriodo.length : 0;
  const roi = totalCustosAds > 0 ? ((faturamento - totalCustosAds) / totalCustosAds * 100) : 0;

  // === Metas de Vendas (por mês selecionado) ===
  const mesRefAtual = useMemo(() => {
    if (period === "month" || period === "today") {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    // For custom/quarter, use the start date month
    if (start && start !== "2000-01-01") {
      const [y, m] = start.split("-");
      return `${y}-${m}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, [period, start]);

  const metaVendaGeral = useMemo(() => {
    const item = metaVendaGeralCfg.find(m => (m as any).mes_ref === mesRefAtual);
    return item ? Number(item.valor) || 0 : (metaVendaGeralCfg.length > 0 ? Number(metaVendaGeralCfg[0].valor) || 0 : 0);
  }, [metaVendaGeralCfg, mesRefAtual]);
  const metaRenovacao = useMemo(() => {
    const item = metaRenovacaoCfg.find(m => (m as any).mes_ref === mesRefAtual);
    return item ? Number(item.valor) || 0 : (metaRenovacaoCfg.length > 0 ? Number(metaRenovacaoCfg[0].valor) || 0 : 0);
  }, [metaRenovacaoCfg, mesRefAtual]);
  const metaVolume = useMemo(() => {
    const item = metaVolumeCfg.find(m => (m as any).mes_ref === mesRefAtual);
    return item ? Number(item.valor) || 0 : (metaVolumeCfg.length > 0 ? Number(metaVolumeCfg[0].valor) || 0 : 0);
  }, [metaVolumeCfg, mesRefAtual]);

  const totalRenovacoes = vendasFechamentoNoPeriodo.filter(v => v.is_renovacao).length;
  const pctRenovacao = metaRenovacao > 0 ? (totalRenovacoes / metaRenovacao) * 100 : 0;
  const totalVendasUnidades = vendasFechamentoNoPeriodo.length;

  const totalConfirmado = totalAgendadas;
  const totalReal = totalCompareceramDiarios;
  const showUpRate = totalConfirmado > 0 ? (totalReal / totalConfirmado) * 100 : 0;


  // === Insights ===
  // cs-overview-alertas-confiaveis-v5-2
  // Metas alinhadas às etapas do Funil XPTO.
  // Indicadores de atividade no período, não de coorte.
  const insights = useMemo(() => {
    const alerts: {
      msg: string;
      severity: "warning" | "destructive";
    }[] = [];

    const registrarDesvio = (
      titulo: string,
      numerador: number,
      denominador: number,
      meta: number
    ) => {
      if (
        !Number.isFinite(numerador) ||
        !Number.isFinite(denominador) ||
        denominador <= 0 ||
        numerador < 0 ||
        numerador > denominador
      ) {
        // Fontes ou datas podem gerar volumes incompatíveis.
        // Não classificar essa relação como conversão.
        return;
      }

      const taxa = (numerador / denominador) * 100;

      if (taxa < meta) {
        alerts.push({
          msg:
            `${titulo}: ${taxa.toFixed(1).replace(".", ",")}% ` +
            `(referência: ${meta}%). ` +
            "Indicador das atividades do período.",
          severity: "warning",
        });
      }
    };

    if (!loadingLeadsDiario && !loadingMqlDiario) {
      registrarDesvio(
        "Atenção na qualificação — Leads recebidos → MQL",
        totalMQLDiarios,
        totalLeadsDiarios,
        35
      );
    }

    if (!loadingMqlDiario && !loadingReunioesDiario) {
      registrarDesvio(
        "Atenção no agendamento — MQL → Reuniões agendadas",
        totalAgendadas,
        totalMQLDiarios,
        70
      );
    }

    if (!loadingReunioesDiario) {
      registrarDesvio(
        "Atenção no comparecimento — Agendadas → Realizadas",
        totalCompareceramDiarios,
        totalAgendadas,
        70
      );
    }

    if (!loadingReunioesDiario && !loadingPropostasResumo) {
      registrarDesvio(
        "Atenção nas propostas — Reuniões realizadas → Propostas enviadas",
        propostasResumoRaw.length,
        totalCompareceramDiarios,
        70
      );
    }

    if (!loadingPropostasResumo && !loadingVendas) {
      registrarDesvio(
        "Atenção no fechamento — Propostas enviadas → Vendas fechadas",
        totalVendasUnidades,
        propostasResumoRaw.length,
        30
      );
    }

    // A antiga referência histórica de CPL dividia
    // custos totais de Ads pelo número de vendas.
    // Ela não é comparável ao CPL atual, calculado
    // sobre leads pagos. O alerta é suspenso até
    // existir uma base histórica equivalente.

    return alerts;
  }, [
    totalLeadsDiarios,
    totalMQLDiarios,
    totalAgendadas,
    totalCompareceramDiarios,
    propostasResumoRaw.length,
    totalVendasUnidades,
    loadingLeadsDiario,
    loadingMqlDiario,
    loadingReunioesDiario,
    loadingPropostasResumo,
    loadingVendas,
  ]);

  // === Chart data ===
  const funnelData = useMemo(() => {
    return [
      { name: "Leads", value: totalLeadsDiarios, fill: "#C8102E" },
      { name: "MQL", value: totalMQLDiarios, fill: "#E8384F" },
      { name: "Reunião", value: totalAgendadas, fill: "#FF6B6B" },
      { name: "Fechado", value: fechadasSafra.length, fill: "#FF8E8E" },
    ];
  }, [totalLeadsDiarios, totalMQLDiarios, totalAgendadas, fechadasSafra]);

  const segmentoData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => { const seg = v.segmento || "Sem segmento"; map[seg] = (map[seg] || 0) + Number(v.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFechamentoNoPeriodo]);

  const produtoData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => { const p = v.produto || "Sem produto"; map[p] = (map[p] || 0) + Number(v.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFechamentoNoPeriodo]);

  // === Gráfico de Faturamento por Dia (data_fechamento) ===
  const receitaDiariaData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => {
      const d = v.data_fechamento!;
      map[d] = (map[d] || 0) + Number(v.valor);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valor]) => ({ data, valor }));
  }, [vendasFechamentoNoPeriodo]);

  // cs-dinamica-resumo-v17
  // A serie visual inclui dias sem fechamento.
  // A origem e os totais de vendas nao sao alterados.
  const receitaDiariaVisual = useMemo(() => {
    const primeiro = Date.parse(`${start}T12:00:00Z`);
    const ultimo = Date.parse(`${end}T12:00:00Z`);
    const quantidade = Math.round(
      (ultimo - primeiro) / 86400000
    ) + 1;

    if (
      !Number.isFinite(primeiro) ||
      !Number.isFinite(ultimo) ||
      quantidade < 1 ||
      quantidade > 62
    ) {
      return receitaDiariaData;
    }

    const valores = new Map(
      receitaDiariaData.map(d => [d.data, d.valor])
    );

    return Array.from({ length: quantidade }, (_, i) => {
      const data = new Date(
        primeiro + i * 86400000
      ).toISOString().slice(0, 10);

      return {
        data,
        valor: valores.get(data) ?? 0,
      };
    });
  }, [receitaDiariaData, start, end]);


  const motivosData = useMemo(() => {
    const map: Record<string, number> = {};
    // Usa todas as vendas perdidas independente do período (visão histórica de padrão)
    const base = filterFunis.length > 0 ? vendas.filter(v => filterFunis.includes(v.funil)) : vendas;
    base.filter(v => v.status === "Perdido").forEach(v => { const m = v.motivo_perda || "Não informado"; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendas, filterFunis]);


  // cs-overview-inteligencia-v5-1
  // Resumos derivados dos mesmos dados dos graficos.
  const produtoPrincipal = produtoData[0];
  const segmentoPrincipal = segmentoData[0];
  const motivoPrincipal = motivosData[0];

  const receitaProdutosTotal = produtoData.reduce(
    (s, item) => s + item.value, 0
  );

  const receitaSegmentosTotal = segmentoData.reduce(
    (s, item) => s + item.value, 0
  );

  const perdasHistoricasTotal = motivosData.reduce(
    (s, item) => s + item.value, 0
  );

  const participacaoProduto =
    produtoPrincipal && receitaProdutosTotal > 0
      ? Math.min(100, Math.max(
          0, produtoPrincipal.value / receitaProdutosTotal * 100
        ))
      : 0;

  const participacaoSegmento =
    segmentoPrincipal && receitaSegmentosTotal > 0
      ? Math.min(100, Math.max(
          0, segmentoPrincipal.value / receitaSegmentosTotal * 100
        ))
      : 0;

  const participacaoMotivo =
    motivoPrincipal && perdasHistoricasTotal > 0
      ? Math.min(100, Math.max(
          0, motivoPrincipal.value / perdasHistoricasTotal * 100
        ))
      : 0;

  const showUpData = useMemo(() => {
    const dateMap: Record<string, { confirmado: number; real: number }> = {};
    reunioesDiarioRaw.forEach((r: any) => {
      if (!r.data) return;
      if (!dateMap[r.data]) dateMap[r.data] = { confirmado: 0, real: 0 };
      dateMap[r.data].confirmado += 1;
      if (r.compareceu) dateMap[r.data].real += 1;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([data, vals]) => ({ data, Confirmado: vals.confirmado, Real: vals.real }));
  }, [reunioesDiarioRaw]);

  // === Daily performance pivot table ===
  const funilNames = useMemo(() => {
    const names = new Set(filteredMetricas.map(m => m.funil));
    return Array.from(names).sort();
  }, [filteredMetricas]);

  const dailyTableData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    filteredMetricas.forEach(m => {
      if (!dateMap[m.data]) dateMap[m.data] = {};
      dateMap[m.data][m.funil] = (dateMap[m.data][m.funil] || 0) + m.leads_recebidos;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([data, funis]) => {
        const total = Object.values(funis).reduce((s, v) => s + v, 0);
        return { data, ...funis, TOTAL: total };
      });
  }, [filteredMetricas]);

  // === Conversion line chart data (automático: leads_geografia + reunioes_agendadas) ===
  const conversionLineData = useMemo(() => {
    const dateMap: Record<string, { mql: number; agendadas: number; compareceram: number }> = {};
    mqlDiarioRaw.forEach((m: any) => {
      const dia = (m.created_at || "").split("T")[0];
      if (!dia) return;
      if (!dateMap[dia]) dateMap[dia] = { mql: 0, agendadas: 0, compareceram: 0 };
      dateMap[dia].mql += 1;
    });
    reunioesDiarioRaw.forEach((r: any) => {
      if (!r.data) return;
      if (!dateMap[r.data]) dateMap[r.data] = { mql: 0, agendadas: 0, compareceram: 0 };
      dateMap[r.data].agendadas += 1;
      if (r.compareceu) dateMap[r.data].compareceram += 1;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, vals]) => ({ data, "Leads Qualificados": vals.mql, "Reuniões Agendadas": vals.agendadas, "Compareceram": vals.compareceram }));
  }, [mqlDiarioRaw, reunioesDiarioRaw]);

  const [filtrosHeaderAberto, setFiltrosHeaderAberto] = useState(false);

  return (
    <div className="cs-v32-shell space-y-4 sm:space-y-6 min-w-0 pb-8">
      {/* cs-dash-mobile-header-v2-7 */}
      <header className="cs-overview-v32-header cs-overview-v28-header flex min-w-0 flex-col gap-0.5 sm:gap-1">
        <h1
          className="font-display text-[22px] font-bold
            leading-tight tracking-wide text-foreground
            sm:text-3xl"
        >
          <span className="cs-v32-white">Visão</span>{" "}<span className="cs-v32-red">Geral</span>
        </h1>

        <p
          className="text-[11px] leading-snug text-muted-foreground
            sm:text-[10px] sm:uppercase sm:tracking-[0.16em]"
        >
          <span className="sm:hidden">
            Painel executivo
          </span>
          <span className="hidden sm:inline">
            Painel executivo · Comercial e Inteligência do Negócio
          </span>
        </p>

        
<button
  type="button"
  className="cs-overview-v28-date cs-overview-v32-date"
  onClick={() => setFiltrosHeaderAberto(true)}
  aria-label="Alterar período selecionado"
>
  <span className="cs-v32-calendar" aria-hidden="true">
    <svg width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M7 3v4M17 3v4M3 10h18"/>
    </svg>
  </span>
  <strong>
    {start.split("-").reverse().join("/")}
    {" — "}
    {end.split("-").reverse().join("/")}
  </strong>
  <span className="cs-v32-chevron" aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </span>
</button>

      </header>

      {/* Filtros rápidos por funil */}
      {/* cs-dash-mobile-filtros-v2-8 */}
      <div className="cs-v32-filter-row flex min-w-0 items-center gap-2 sm:flex-wrap sm:gap-1.5">
        <div
          role="group"
          aria-label="Selecionar funis comerciais"
          className="min-w-0 flex-1 overflow-x-auto
            overscroll-x-contain [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden sm:contents"
        >
          <div className="flex w-max items-center gap-1.5 py-0.5 sm:contents">
        <button
          type="button"
          onClick={() => setFilterFunis([])}
          className={cn("fchip shrink-0 whitespace-nowrap", filterFunis.length === 0 && "active")}
        >
          Todos os funis
        </button>
        {funis.filter((f: any) => f.visivel !== false).map(f => {
          const active = filterFunis.includes(f.valor);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFunil(f.valor)}
              className={cn("fchip shrink-0 whitespace-nowrap", active && "active")}
            >
              {f.valor}
            </button>
          );
        })}

          </div>
        </div>

        <Sheet open={filtrosHeaderAberto} onOpenChange={setFiltrosHeaderAberto}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="cs-v32-filter-button ml-0 shrink-0 gap-2 bg-muted/50 sm:ml-auto">
              <Filter className="h-3.5 w-3.5" /> Filtros
              {filtrosPainelCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                  {filtrosPainelCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="cs-filtro-drawer-v23 bg-card border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros {filtrosPainelCount > 0 && <span className="text-muted-foreground font-normal">({filtrosPainelCount})</span>}</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Período</Label>
                
{/* cs-filtro-periodo-visao-geral-v25 */}
<div
  role="group"
  aria-label="Período"
  className="grid grid-cols-2 gap-2"
>
  {PERIOD_OPTIONS.map((p) => (
    <button
      key={p.value}
      type="button"
      aria-pressed={period === p.value}
      onClick={() => setPeriod(p.value)}
      className={cn(
        "min-h-11 rounded-lg border px-2 py-2",
        "text-[12px] sm:text-[13px] font-semibold",
        "cursor-pointer transition-colors",
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/60",
        p.value === "all" && "col-span-2",
        period === p.value
          ? "border-primary/65 bg-primary/[0.13] text-foreground"
          : "border-white/[0.10] bg-white/[0.025] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      )}
    >
      {p.label}
    </button>
  ))}
</div>

              </div>
              {period === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">De</Label>
                    <CsDatePicker
                       value={customStart}
                       onChange={setCustomStart}
                       placeholder="Data inicial"
                       ariaLabel="Data inicial"
                     />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Até</Label>
                    <CsDatePicker
                       value={customEnd}
                       onChange={setCustomEnd}
                       placeholder="Data final"
                       ariaLabel="Data final"
                     />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Produto</Label>
                <Select value={filterProduto} onValueChange={setFilterProduto}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="cs-filtro-opcoes-v23">
                    <SelectItem value="Todos">Todos</SelectItem>
                    {produtos.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Campanha</Label>
                <Select value={filterCampanha} onValueChange={setFilterCampanha}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="cs-filtro-opcoes-v23">
                    <SelectItem value="Todos">Todos</SelectItem>
                    {campanhas.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Origem</Label>
                <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent className="cs-filtro-opcoes-v23">
                    <SelectItem value="Todos">Todos</SelectItem>
                    {origens.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={excludeRenovacao} onCheckedChange={setExcludeRenovacao} id="exclude-renovacao" />
                <Label htmlFor="exclude-renovacao" className="text-xs text-muted-foreground cursor-pointer">
                  Retirar renovação
                </Label>
              </div>
            </div>
            <SheetFooter className="mt-8 flex-row gap-2 sm:justify-start">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPeriod("month"); setCustomStart(""); setCustomEnd("");
                  setFilterProduto("Todos"); setFilterCampanha("Todos"); setFilterOrigem("Todos");
                  setExcludeRenovacao(false);
                }}
              >
                Limpar filtros
              </Button>
              <SheetClose asChild>
                <Button className="flex-1 bg-primary hover:bg-primary/90">Aplicar filtros</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>


      
      {/* cs-intelligence-prototype-v34 */}
      {(insights.length > 0 || totalAgendadas > 0) && (
        <section
          className="cs-intel-v34-section cs-layout-v41-panel"
          aria-label="CS Intelligence"
        >
          <div className="cs-intel-v34-heading">
            <div className="cs-intel-v34-heading-icon">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="cs-section-title">CS INTELLIGENCE</h2>
              <p className="cs-section-description">
                Principais pontos de atenção e oportunidades do período.
              </p>
            </div>
          </div>

          <div className="cs-intel-v34-grid">
            {insights.slice(0, 2).map((alert, i) => (
              <button
                key={`${i}-${alert.msg}`}
                type="button"
                className="cs-intel-v34-card cs-intel-v34-warning"
                aria-label={`Ver detalhes: ${alert.msg}`}
                onClick={() => setInsightsExpandidos(true)}
              >
                <div className="cs-intel-v34-symbol">
                  <AlertTriangle className="h-7 w-7" />
                </div>

                <div className="cs-intel-v34-content">
                  <h3>
                    {alert.msg.includes("—")
                      ? alert.msg.split("—")[0].trim()
                      : "Ponto de atenção"}
                  </h3>
                  <p>
                    {alert.msg.includes("—")
                      ? alert.msg.slice(
                          alert.msg.indexOf("—") + 1
                        ).trim()
                      : alert.msg}
                  </p>
                </div>

                <span className="cs-intel-v34-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}

            {totalAgendadas > 0 && pctShowUpDiario >= 70 && (
              <button
                type="button"
                className="cs-intel-v34-card cs-intel-v34-positive"
                aria-label="Ver detalhes do show-up"
                onClick={() => setInsightsExpandidos(true)}
              >
                <div className="cs-intel-v34-symbol">
                  <TrendingUp className="h-7 w-7" />
                </div>

                <div className="cs-intel-v34-content">
                  <h3>Show-up em destaque</h3>
                  <p>
                    <strong>
                      {pctShowUpDiario.toFixed(1).replace(".", ",")}%
                    </strong>
                    {" "}de presença nas reuniões.
                  </p>
                  <p>
                    {totalCompareceramDiarios} comparecimentos em
                    {" "}{totalAgendadas} agendamentos.
                  </p>
                </div>

                <span className="cs-intel-v34-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            )}

            <button
              type="button"
              className="cs-intel-v34-all"
              aria-expanded={insightsExpandidos}
              onClick={() => setInsightsExpandidos(v => !v)}
            >
              {insightsExpandidos
                ? "Ocultar detalhes"
                : "Ver todos os insights"}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {insightsExpandidos && (
            <div className="cs-intel-v34-expanded">
              <h3>Indicadores do período</h3>

              {insights.map((alert, i) => (
                <p key={`${i}-${alert.msg}`}>
                  {alert.msg}
                </p>
              ))}

              {totalAgendadas > 0 && (
                <p>
                  Show-up registrado:
                  {" "}{pctShowUpDiario.toFixed(1).replace(".", ",")}%
                  {" "}({totalCompareceramDiarios} de
                  {" "}{totalAgendadas} agendamentos).
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Commercial KPIs - Executive Overview */}
      {/* cs-results-iconografia-fiel-v46 */}
{/* cs-results-nav-v50-final */}
<section className="cs-overview-executive-v1 cs-overview-v28-results cs-layout-v41-panel space-y-4">
        <h2 className="cs-section-title text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          

<svg className="cs-results-v42-heading-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2.3"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true">
  <path d="M3.5 9.5 12 3.8l8.5 5.7V20H3.5V9.5Z"/>
  <path d="M9 13.2h6M12 10.2v6"/>
</svg> Resultados do Período
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
          <div className="cs-overview-primary xl:col-span-5 rounded-xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-4 min-w-0" data-cs-estado={metaVendaGeral <= 0 ? "neutro" : faturamento >= metaVendaGeral ? "positivo" : "negativo"}>
            {isLoading ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  

<svg className="cs-results-v41-revenue-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2.1"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true">
  <path d="M8.5 3.5h7l-1.8 3h-3.4l-1.8-3Z"/>
  <path d="M10.3 6.5h3.4
    c3 3.2 5.8 6.9 5.8 10
    a4.5 4.5 0 0 1-4.5 4.5H9
    a4.5 4.5 0 0 1-4.5-4.5
    c0-3.1 2.8-6.8 5.8-10Z"/>
  <path d="M10.4 6.5h3.2"/>
  <path d="M14.2 11.6c-.6-.7-1.3-1-2.2-1
    -1.2 0-2 .6-2 1.5
    0 1 1 1.5 2 1.8
    1.2.3 2 .9 2 1.9
    0 1-.9 1.6-2.1 1.6
    -.8 0-1.6-.3-2.1-.9"/>
  <path d="M12 9.5v9"/>
</svg>Faturamento no período
                </p>
                <p className="cs-overview-revenue mt-2 font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground break-words">
                  {`${formatarMoedaCS(faturamento)}`}
                </p>

                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Meta de faturamento</p>
                    <p className="mt-1 text-sm font-medium">
                      {`${formatarMoedaCS(metaVendaGeral)}`}
                    </p>
                  </div>
                  {metaVendaGeral > 0 && (
                    <p className="font-display text-2xl font-bold text-primary">
                      {`${formatarPctCS((faturamento / metaVendaGeral) * 100)}`}
                    </p>
                  )}
                </div>

                {metaVendaGeral > 0 && (
                  <>
                    <div
                      role="progressbar"
                      aria-label="Progresso da meta de faturamento"
                      aria-valuenow={Math.min(100, Math.max(0, (faturamento / metaVendaGeral) * 100))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(0, (faturamento / metaVendaGeral) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {faturamento >= metaVendaGeral
                        ? "Meta atingida"
                        : `Faltam ${formatarMoedaCS(metaVendaGeral - faturamento)} para atingir a meta`}
                    </p>
                  </>
                )}

                <p className="mt-2 text-xs text-muted-foreground">
                  {excludeRenovacao
                    ? `${vendasParaFaturamento.length} vendas, sem renovações`
                    : `${vendasFechamentoNoPeriodo.length} vendas fechadas no período`}
                </p>
              </>
            )}
          
        {/* cs-results-nav-position-v51 */}
<a
        href="/analises"
        className="cs-results-v50-nav"
        aria-label="Abrir análises de faturamento"
        title="Ver Análises e Detalhes"
      >
        <svg viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </a>
</div>

          <div className="cs-overview-support-grid xl:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : (
              <>
                <div className="cs-overview-support rounded-xl border border-border/70 bg-card/70 p-4 min-w-0" data-cs-estado={obterEstadoResultadoV65("vendas", vendasFechamentoNoPeriodo, vendasComparacaoAnteriorV44, excludeRenovacao)}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wider">Total de vendas</p>
                  </div>
                  <p className="cs-overview-support-value mt-3 text-xl md:text-2xl font-bold break-words tabular-nums">{totalVendasUnidades}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metaVolume > 0
                      ? `Meta: ${metaVolume} | ${((totalVendasUnidades / metaVolume) * 100).toFixed(0)}%`
                      : "Unidades no período"}
                  </p>
                  <ResultadosTendenciaV44 tipo="vendas" vendasAtuais={vendasFechamentoNoPeriodo} vendasAnteriores={vendasComparacaoAnteriorV44} excluirRenovacao={excludeRenovacao} inicio={start} fim={end} anteriorInicio={comparacaoInicioV44} anteriorFim={comparacaoFimV44} />
                
      <a
        href="/analises"
        className="cs-results-v50-nav"
        aria-label="Abrir análises de total de vendas"
        title="Ver Análises e Detalhes"
      >
        <svg viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </a>
</div>
                <div className="cs-overview-support rounded-xl border border-border/70 bg-card/70 p-4 min-w-0" data-cs-estado={obterEstadoResultadoV65("ticket", vendasFechamentoNoPeriodo, vendasComparacaoAnteriorV44, excludeRenovacao)}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    <p className="text-xs uppercase tracking-wider">Ticket médio</p>
                  </div>
                  <p className="cs-overview-support-value mt-3 text-xl md:text-2xl font-bold break-words tabular-nums">
                    {`${formatarMoedaCS(ticketMedio)}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Por venda fechada</p>
                  <ResultadosTendenciaV44 tipo="ticket" vendasAtuais={vendasFechamentoNoPeriodo} vendasAnteriores={vendasComparacaoAnteriorV44} excluirRenovacao={excludeRenovacao} inicio={start} fim={end} anteriorInicio={comparacaoInicioV44} anteriorFim={comparacaoFimV44} />
                
      <a
        href="/analises"
        className="cs-results-v50-nav"
        aria-label="Abrir análises de ticket médio"
        title="Ver Análises e Detalhes"
      >
        <svg viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </a>
</div>

                <div className="cs-overview-support rounded-xl border border-border/70 bg-card/70 p-4 min-w-0" data-cs-estado={obterEstadoResultadoV65("renovacao", vendasFechamentoNoPeriodo, vendasComparacaoAnteriorV44, excludeRenovacao)}>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    

<svg className="cs-results-v42-renew-icon"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  aria-hidden="true">
  <path d="M20 8a8 8 0 0 0-14.5-2"/>
  <path d="M5.5 2.5V6h3.5"/>
  <path d="M4 16a8 8 0 0 0 14.5 2"/>
  <path d="M18.5 21.5V18H15"/>
  <path d="M14.4 10.5a3 3 0 0 0-2.3-.8
    c-1.2 0-2 .6-2 1.5
    0 1 1 1.4 2 1.8
    1.1.3 1.8.8 1.8 1.8
    0 1-.9 1.6-2 1.6
    -.8 0-1.5-.3-2.1-.8"/>
  <path d="M12 8.5v8"/>
</svg>
                    <p className="text-xs uppercase tracking-wider">Faturamento de renovação</p>
                  </div>
                  <p className="cs-overview-support-value mt-3 text-xl md:text-2xl font-bold break-words tabular-nums">
                    {`${formatarMoedaCS(faturamentoRenovacao)}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {`${totalRenovacoes} renovações`}
                  </p>
                  <ResultadosTendenciaV44 tipo="renovacao" vendasAtuais={vendasFechamentoNoPeriodo} vendasAnteriores={vendasComparacaoAnteriorV44} excluirRenovacao={excludeRenovacao} inicio={start} fim={end} anteriorInicio={comparacaoInicioV44} anteriorFim={comparacaoFimV44} />
                
      <a
        href="/analises"
        className="cs-results-v50-nav"
        aria-label="Abrir análises de renovações"
        title="Ver Análises e Detalhes"
      >
        <svg viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </a>
</div>

              </>
            )}
          </div>
        
      
</div>

      </section>

      {/* cs-dash-mobile-nav-v2-6-1 */}
      <div className="cs-overview-v29-stack min-w-0 space-y-6">
        <section id="cs-overview-comercial" aria-label="Performance e dinâmica comercial" className="space-y-5">

      
      {/* cs-overview-funil-resumo-v4: somente Visao Geral */}
      <ResumoFunilExecutivo
        indicadores={{
          agendamento: pctAgendamento,
          showUp: pctShowUpDiario,
          conversaoSafra: pctLeadVenda,
          totalLeads: totalLeadsDiarios,
        }}
        inicio={start}
        fim={end}
        filtrosSomenteVendas={[
          ...(filterProduto !== "Todos" ? ["Produto"] : []),
          ...(filterCampanha !== "Todos" ? ["Campanha"] : []),
          ...(filterOrigem !== "Todos" ? ["Origem"] : []),
        ]}
        funis={
          filterFunis.length > 0
            ? filterFunis.join(", ")
            : "Todos os funis"
        }
        carregando={
          loadingLeadsDiario ||
          loadingMqlDiario ||
          loadingReunioesDiario ||
          loadingPropostasResumo ||
          loadingVendas
        }
        etapas={[
          {
            nome: "Leads recebidos",
            valor: totalLeadsDiarios,
            cor: "#F7304E",
          },
          {
            nome: "MQL qualificados",
            valor: totalMQLDiarios,
            cor: "#E88B23",
          },
          {
            nome: "Reuniões agendadas",
            valor: totalAgendadas,
            cor: "#17A66A",
          },
          {
            nome: "Reuniões realizadas",
            valor: totalCompareceramDiarios,
            cor: "#12A4BC",
          },
          {
            nome: "Propostas enviadas",
            valor: propostasResumoRaw.length,
            cor: "#2874D5",
          },
          {
            nome: "Vendas fechadas",
            valor: totalVendasUnidades,
            cor: "#903DC8",
          },
        ]}
      />


      
      {/* cs-dashboard-dinamica-v3 */}
      <section className="cs-overview-v29-dinamica cs-layout-v41-panel space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="cs-section-title font-display text-base font-bold">
              Dinâmica Comercial
            </h2>
            <p className="cs-section-description text-xs text-muted-foreground">
              Acompanhe a entrada de leads e a evolução comercial
            </p>
          </div>
          <a
            href="/analises"
            className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
          >
            Ver Análises e Detalhes
          </a>
        </div>

        <Tabs defaultValue="chegada" className="space-y-3">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 rounded-lg border border-border/60 bg-muted/20 p-1.5">
            <TabsTrigger value="chegada" className="data-[state=active]:bg-[#F7304E] data-[state=active]:text-white">
              Chegada de Leads
            </TabsTrigger>
            <TabsTrigger value="ritmo" className="data-[state=active]:bg-[#F7304E] data-[state=active]:text-white">
              Ritmo do Funil
            </TabsTrigger>
            <TabsTrigger value="faturamento" className="data-[state=active]:bg-[#F7304E] data-[state=active]:text-white">
              Faturamento por Dia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chegada" className="mt-0 min-w-0">
            <div className="cs-overview-v29-leads-preview">
              <DinamicaLeadsExecutivaV1
                paginaInicio={start}
                paginaFim={end}
                funisSelecionados={filterFunis}
                idsFunis={pipelineIdsFiltrados.map(String)}
                todosFunis={todosFunisSelecionados}
              />
              {/* cs-dinamica-v12: analise integrada */}
            </div>
          </TabsContent>

          {/* cs-dinamica-graficos-v16 */}
<TabsContent value="ritmo" className="mt-0 min-w-0">
            <GlassCard className="cs-dyn-v16-panel">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" /> Ritmo do Funil — Atividades Diárias
        </h3>
        <div className="cs-dyn-v17-metrics">
          <span>
            <i style={{ background: "#F7304E" }} />
            <strong>
              {conversionLineData.reduce(
                (s, d) => s + Number(d["Leads Qualificados"] ?? 0),
                0
              ).toLocaleString("pt-BR")}
            </strong>
            MQLs
          </span>
          <span>
            <i style={{ background: "#F5A524" }} />
            <strong>
              {conversionLineData.reduce(
                (s, d) => s + Number(d["Reuniões Agendadas"] ?? 0),
                0
              ).toLocaleString("pt-BR")}
            </strong>
            Agendamentos
          </span>
          <span>
            <i style={{ background: "#13CFA1" }} />
            <strong>
              {conversionLineData.reduce(
                (s, d) => s + Number(d["Compareceram"] ?? 0),
                0
              ).toLocaleString("pt-BR")}
            </strong>
            Comparecimentos
          </span>
        </div>
        {(loadingMqlDiario || loadingReunioesDiario) ? <ChartSkeleton /> : conversionLineData.length > 0 ? (
          <div className="cs-dyn-v16-chart">
            <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
                data={conversionLineData}
                margin={{ top: 12, right: 14, bottom: 0, left: -10 }}
              >
              <XAxis
                  dataKey="data"
                  tickFormatter={(v: string) =>
                    v.length >= 10
                      ? `${v.slice(8, 10)}/${v.slice(5, 7)}`
                      : v
                  }
                  tick={{ fill: "#9DAFC5", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
              <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#9DAFC5", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
              <Tooltip cursor={false} contentStyle={{
                  backgroundColor: "#131E2C",
                  border: "1px solid rgba(132,155,184,.30)",
                  borderRadius: 9,
                  color: "#F4F8FD",
                  boxShadow: "0 14px 34px rgba(0,0,0,.38)",
                }}
                labelStyle={{
                  color: "#CAD9EA",
                  fontSize: 11,
                  fontWeight: 650,
                }}
                itemStyle={{ fontSize: 11 }} />
              <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{
                    fontSize: 11,
                    color: "#B8C8DC",
                    paddingTop: 8,
                  }}
                />
              <Area
                  type="linear"
                  dataKey="Leads Qualificados"
                  stroke="#F7304E"
                  strokeWidth={2.2}
                  fill="transparent"
                  fillOpacity={0}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              <Line type="linear" dataKey="Reuniões Agendadas" stroke="#F5A524" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="linear" dataKey="Compareceram" stroke="#13CFA1" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
        )}
      </GlassCard>
          </TabsContent>

          <TabsContent value="faturamento" className="mt-0 min-w-0">
            <GlassCard className="cs-dyn-v16-panel">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
          <DollarSign className="h-3.5 w-3.5" /> Faturamento por Dia (Data de Fechamento)
        </h3>
        <div className="cs-dyn-v17-metrics">
          <span>
            <i style={{ background: "#F7304E" }} />
            <strong>
              {receitaDiariaData.reduce(
                (s, d) => s + Number(d.valor ?? 0),
                0
              ).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
            Fechado no período
          </span>
          <span>
            <strong>
              {receitaDiariaData.filter(
                d => Number(d.valor) > 0
              ).length}
            </strong>
            Dias com vendas
          </span>
        </div>
        {isLoading ? <ChartSkeleton /> : receitaDiariaData.length > 0 ? (
          <div className="cs-dyn-v16-chart">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={receitaDiariaVisual}
                barCategoryGap="38%"
                margin={{ top: 10, right: 14, bottom: 0, left: 0 }}
              >
              <XAxis
                  dataKey="data"
                  tickFormatter={(v: string) =>
                    v.length >= 10
                      ? `${v.slice(8, 10)}/${v.slice(5, 7)}`
                      : v
                  }
                  tick={{ fill: "#9DAFC5", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
              <YAxis
                  tick={{ fill: "#9DAFC5", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tickFormatter={(v: number) =>
                    v >= 1000
                      ? `R$ ${(v / 1000).toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })} mil`
                      : `R$ ${v.toLocaleString("pt-BR")}`
                  }
                />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: "#131E2C",
                  border: "1px solid rgba(132,155,184,.30)",
                  borderRadius: 9,
                  color: "#F4F8FD",
                  boxShadow: "0 14px 34px rgba(0,0,0,.38)",
                }}
                labelStyle={{
                  color: "#CAD9EA",
                  fontSize: 11,
                  fontWeight: 650,
                }}
                itemStyle={{ fontSize: 11 }}
                formatter={(v: number) =>
                  `R$ ${Number(v).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }
              />
              <Bar
                  dataKey="valor"
                  fill="#F7304E"
                  maxBarSize={42}
                  radius={[5, 5, 0, 0]}
                  name="Faturamento"
                  isAnimationActive={false}
                />
            </BarChart>
          </ResponsiveContainer>
          </div>
        ) : (
          <div className="cs-dyn-v16-empty">Sem vendas fechadas no período</div>
        )}
        <div className="mt-4">
          <AIAnalysisButton section="Faturamento por Dia" dataPayload={{
            periodo: PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period,
            faturamento_total: `${formatarMoedaCS(faturamento)}`,
            total_dias_com_venda: receitaDiariaData.filter((d: any) => d.valor > 0).length,
            maior_dia: receitaDiariaData.length > 0 ? receitaDiariaData.reduce((max: any, d: any) => d.valor > max.valor ? d : max, receitaDiariaData[0]) : null,
            media_diaria: receitaDiariaData.length > 0 ? `R$ ${(faturamento / receitaDiariaData.filter((d: any) => d.valor > 0).length || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—",
          }} />
        </div>
      </GlassCard>
          </TabsContent>
        </Tabs>
      </section>

      {/* Meta x Vendido preservado na Inteligencia V5 */}

                </section>
        <section id="cs-overview-inteligencia" aria-label="Inteligência do Negócio" className="space-y-5">


      {/* cs-overview-inteligencia-v5 */}
      <section className="cs-intel-v25-section cs-intel-v28-section space-y-4 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="cs-section-title font-display text-base font-bold text-foreground">
              Inteligência do Negócio
            </h2>
            <p className="cs-section-description mt-1 text-xs text-muted-foreground">
              Indicadores essenciais para identificar desvios e aprofundar análises.
            </p>
          </div>

          <a
            href="/analises"
            className="inline-flex min-h-9 items-center rounded-lg border
              border-primary/35 px-3 text-xs font-semibold
              text-primary hover:bg-primary/10"
          >
            Ver Análises e Detalhes
          </a>
        </div>

        {/* cs-intel-prototipo-v29: modulo de cinco cards conforme layout aprovado */}
        <div className="cs-intel-v29-feature">
<h3 className="cs-intel-v25-heading cs-intel-v28-subheading">Principais destaques</h3>

        <div className="cs-intel-v25-grid cs-intel-v28-highlights grid">

          <a
            href="/analises?tab=geografico"
            className="flex min-w-0 flex-col justify-between
              cs-intel-v24-card cs-intel-v25-card cs-intel-v29-card rounded-xl border border-border/70 bg-card/80 p-5
              transition-colors hover:border-primary/50
              hover:bg-primary/[0.04]"
          >
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#F7304E]" />
                <p className="text-[14px] leading-5 font-semibold text-foreground">
                Mapa Geográfico
              </p>
              </div>
              <span className="mt-2 inline-flex max-w-full rounded-md border border-border/70 bg-background/30 px-2 py-1 text-[11px] font-medium leading-tight text-muted-foreground">Histórico · todos os funis</span>

              <div className="cs-intel-v24-summary min-w-0">
                  <ResumoGeoExecutivoV53 />
                </div>
            </div>
            
            {/* cs-intel-mapa-brasil-v292: contorno real Natural Earth simplificado; sem regiao simulada */}
            <div className="cs-intel-v29-media cs-intel-v29-map" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
                   role="presentation" focusable="false">
                <defs>
                  <linearGradient id="cs-map-real-v292" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#334A62" />
                    <stop offset="100%" stopColor="#172A3D" />
                  </linearGradient>
                </defs>
                <path
                  d="M52.1 90.7 L51.5 89.5 L52.4 88.5 L51.2 87.1 L44.5 83.1 L43.2 83.3 L48.3 78.4 L51.5 76.4 L51.5 74.7 L50.5 73.5 L49.4 73.9 L50.1 70.3 L47.8 70.2 L47.0 66.9 L42.5 66.3 L42.7 63.5 L42.0 62.3 L42.7 61.9 L42.5 60.7 L43.4 58.1 L42.9 56.8 L41.8 56.2 L41.9 54.2 L37.9 54.1 L37.1 51.7 L37.7 51.7 L37.2 48.9 L34.6 48.3 L31.5 46.5 L29.2 46.2 L26.9 44.3 L27.1 40.6 L24.3 40.9 L20.9 43.2 L16.2 43.2 L16.3 40.0 L14.6 41.2 L12.8 41.2 L12.0 40.0 L10.6 39.9 L11.0 39.0 L9.0 35.9 L9.5 34.6 L10.8 34.0 L11.3 31.2 L15.7 29.0 L17.6 29.1 L18.5 22.5 L17.3 20.6 L17.3 19.0 L18.9 18.9 L19.0 18.1 L17.7 17.9 L17.7 16.6 L21.8 16.6 L22.5 15.9 L23.5 17.8 L25.0 18.7 L26.6 18.5 L31.2 15.6 L29.3 14.9 L29.1 12.2 L28.2 11.7 L31.8 12.3 L36.2 10.7 L37.0 9.9 L36.7 9.3 L38.3 9.7 L38.0 10.6 L39.2 11.9 L38.3 14.4 L39.0 16.4 L40.2 17.4 L41.3 17.5 L43.8 16.1 L46.6 16.4 L46.6 14.9 L53.0 15.7 L55.6 11.5 L56.4 11.4 L58.0 16.2 L59.2 16.5 L59.2 18.0 L57.6 19.7 L58.3 20.3 L62.0 20.7 L62.1 22.7 L63.6 21.4 L69.7 23.4 L70.8 24.6 L70.4 25.8 L72.9 25.1 L76.9 26.2 L80.0 26.2 L85.8 30.2 L89.2 30.9 L89.9 31.6 L91.0 35.5 L90.2 39.0 L82.8 47.4 L81.5 57.5 L80.5 61.1 L78.4 63.8 L78.0 66.0 L76.3 66.9 L75.8 68.1 L70.3 68.9 L64.0 72.1 L62.2 74.2 L62.3 76.9 L61.4 80.1 L52.1 90.7 Z"
                  fill="url(#cs-map-real-v292)"
                  stroke="#7895B2"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
<span className="mt-5 inline-flex text-sm font-semibold text-primary transition-colors">
              Explorar regiões
            </span>
          </a>

          <button
            type="button"
            aria-pressed={inteligenciaSelecionada === "meta"}
            onClick={() => setInteligenciaSelecionada(
              v => v === "meta" ? null : "meta"
            )}
            className="flex min-w-0 flex-col justify-between
              cs-intel-v24-card cs-intel-v25-card cs-intel-v29-card rounded-xl border border-border/70 bg-card/80 p-5
              text-left transition-colors hover:border-primary/50
              aria-pressed:border-primary/70
              aria-pressed:bg-primary/[0.07]"
          >
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 shrink-0 text-[#F7304E]" />
                <p className="text-[14px] leading-5 font-semibold text-foreground">
                Meta x Vendido
              </p>
              </div>
              <span className="mt-2 inline-flex max-w-full rounded-md border border-border/70 bg-background/30 px-2 py-1 text-[11px] font-medium leading-tight text-muted-foreground">Mês atual · funis visíveis</span>

              <div className="cs-intel-v24-summary min-w-0">
                  <ResumoMetaExecutivoV53 />
                </div>
            </div>
            
            {/* cs-intel-prototipo-v29: simbolo de acompanhamento, sem meta simulada */}
            <div className="cs-intel-v29-media cs-intel-v29-target" aria-hidden="true">
              <svg viewBox="0 0 76 76" fill="none" role="presentation">
                <circle cx="38" cy="38" r="28" stroke="#31445B" strokeWidth="2"/>
                <circle cx="38" cy="38" r="19" stroke="#425771" strokeWidth="2"/>
                <circle cx="38" cy="38" r="10" stroke="#F7304E" strokeOpacity=".85" strokeWidth="2.5"/>
                <path d="M38 4v17M38 55v17M4 38h17M55 38h17" stroke="#69839F" strokeWidth="1.5"/>
                <circle cx="38" cy="38" r="3.5" fill="#F7304E"/>
              </svg>
            </div>
<span className="mt-5 inline-flex text-sm font-semibold text-primary transition-colors">
              Ver desempenho
            </span>
          </button>

          <button
            type="button"
            aria-pressed={inteligenciaSelecionada === "produto"}
            onClick={() => setInteligenciaSelecionada(
              v => v === "produto" ? null : "produto"
            )}
            className="flex min-w-0 flex-col justify-between
              cs-intel-v24-card cs-intel-v25-card cs-intel-v29-card rounded-xl border border-border/70 bg-card/80 p-5
              text-left transition-colors hover:border-primary/50
              aria-pressed:border-primary/70
              aria-pressed:bg-primary/[0.07]"
          >
            <div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 shrink-0 text-[#F7304E]" />
                <p className="text-[14px] leading-5 font-semibold text-foreground">
                Receita por Produto
              </p>
              </div>
              <span className="mt-2 inline-flex max-w-full rounded-md border border-border/70 bg-background/30 px-2 py-1 text-[11px] font-medium leading-tight text-muted-foreground">Período selecionado</span>
              <p className="mt-1 break-words text-sm font-semibold text-foreground">
                {produtoData.length
                  ? [...produtoData].sort(
                      (a, b) => b.value - a.value
                    )[0].name
                  : "Sem dados no período"}
              </p>

              {!isLoading && produtoPrincipal && (
                <div className="mt-3 space-y-2">
                  <p className="text-[25px] 2xl:text-[27px] leading-tight font-bold tracking-tight tabular-nums text-foreground">
                    R$ {produtoPrincipal.value.toLocaleString(
                      "pt-BR", { maximumFractionDigits: 0 }
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participacaoProduto.toFixed(1).replace(".", ",")}%
                    da receita de produtos
                  </p>
                  <div className="cs-intel-v28-microbars" aria-label="Participação do produto lider">
                      {[...produtoData]
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 1)
                        .map((item, indice) => (
                          <div
                            key={`${item.name}-${indice}`}
                            className="cs-intel-v28-microtrack cs-bars-v1-participation"
                            role="img"
                            aria-label={`${item.name}: R$ ${item.value.toLocaleString("pt-BR")}`}
                          >
                            <span className="cs-bars-v1-participation-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0,
                                  Number(participacaoProduto) || 0
                                ))}%`,
                                opacity: indice === 0 ? 1 : 0.72 - indice * 0.15,
                              }}
                            />
                          </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
            
            {/* cs-intel-prototipo-v29: categorias reais, sem barras inventadas */}
            <div className="cs-intel-v29-media cs-intel-v29-bars" aria-hidden="true">
              {[...produtoData].sort((a, b) => b.value - a.value).slice(0, 3).map((item, i, arr) => (
                <div className="cs-intel-v29-track" key={`produto-${item.name}-${i}`}>
                  <span style={{
                    width: `${Math.min(100, 100 * item.value / Math.max(1, arr[0]?.value ?? 1))}%`,
                    opacity: 1 - i * 0.25,
                  }}/>
                </div>
              ))}
            </div>
<span className="mt-5 inline-flex text-sm font-semibold text-primary transition-colors">
              Ver produtos
            </span>
          </button>

          <button
            type="button"
            aria-pressed={inteligenciaSelecionada === "segmento"}
            onClick={() => setInteligenciaSelecionada(
              v => v === "segmento" ? null : "segmento"
            )}
            className="flex min-w-0 flex-col justify-between
              cs-intel-v24-card cs-intel-v25-card cs-intel-v29-card rounded-xl border border-border/70 bg-card/80 p-5
              text-left transition-colors hover:border-primary/50
              aria-pressed:border-primary/70
              aria-pressed:bg-primary/[0.07]"
          >
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 shrink-0 text-[#F7304E]" />
                <p className="text-[14px] leading-5 font-semibold text-foreground">
                Receita por Segmento
              </p>
              </div>
              <span className="mt-2 inline-flex max-w-full rounded-md border border-border/70 bg-background/30 px-2 py-1 text-[11px] font-medium leading-tight text-muted-foreground">Período selecionado</span>
              <p className="mt-1 break-words text-sm font-semibold text-foreground">
                {segmentoData.length
                  ? [...segmentoData].sort(
                      (a, b) => b.value - a.value
                    )[0].name
                  : "Sem dados no período"}
              </p>

              {!isLoading && segmentoPrincipal && (
                <div className="mt-3 space-y-2">
                  <p className="text-[25px] 2xl:text-[27px] leading-tight font-bold tracking-tight tabular-nums text-foreground">
                    R$ {segmentoPrincipal.value.toLocaleString(
                      "pt-BR", { maximumFractionDigits: 0 }
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participacaoSegmento.toFixed(1).replace(".", ",")}%
                    da receita de segmentos
                  </p>
                  <div className="cs-intel-v28-microbars" aria-label="Participação do segmento lider">
                      {[...segmentoData]
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 1)
                        .map((item, indice) => (
                          <div
                            key={`${item.name}-${indice}`}
                            className="cs-intel-v28-microtrack cs-bars-v1-participation"
                            role="img"
                            aria-label={`${item.name}: R$ ${item.value.toLocaleString("pt-BR")}`}
                          >
                            <span className="cs-bars-v1-participation-fill"
                              style={{
                                width: `${Math.min(100, Math.max(0,
                                  Number(participacaoSegmento) || 0
                                ))}%`,
                                opacity: indice === 0 ? 1 : 0.72 - indice * 0.15,
                              }}
                            />
                          </div>
                        ))}
                    </div>
                </div>
              )}
            </div>
            
            {/* cs-intel-prototipo-v29: distribuicao real por segmentos */}
            <div className="cs-intel-v29-media cs-intel-v29-bars" aria-hidden="true">
              {[...segmentoData].sort((a, b) => b.value - a.value).slice(0, 3).map((item, i, arr) => (
                <div className="cs-intel-v29-track" key={`segmento-${item.name}-${i}`}>
                  <span style={{
                    width: `${Math.min(100, 100 * item.value / Math.max(1, arr[0]?.value ?? 1))}%`,
                    opacity: 1 - i * 0.25,
                  }}/>
                </div>
              ))}
            </div>
<span className="mt-5 inline-flex text-sm font-semibold text-primary transition-colors">
              Ver segmentos
            </span>
          </button>

          <button
            type="button"
            aria-pressed={inteligenciaSelecionada === "perdas"}
            onClick={() => setInteligenciaSelecionada(
              v => v === "perdas" ? null : "perdas"
            )}
            className="flex min-w-0 flex-col justify-between
              cs-intel-v24-card cs-intel-v25-card cs-intel-v29-card rounded-xl border border-border/70 bg-card/80 p-5
              text-left transition-colors hover:border-primary/50
              aria-pressed:border-primary/70
              aria-pressed:bg-primary/[0.07]"
          >
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#F7304E]" />
                <p className="text-[14px] leading-5 font-semibold text-foreground">
                Motivos de Perda
              </p>
              </div>
              <span className="mt-2 inline-flex max-w-full rounded-md border border-border/70 bg-background/30 px-2 py-1 text-[11px] font-medium leading-tight text-muted-foreground">Histórico · funis selecionados</span>
              <p className="mt-1 break-words text-sm font-semibold text-foreground">
                {motivosData.length
                  ? [...motivosData].sort(
                      (a, b) => b.value - a.value
                    )[0].name
                  : "Sem dados disponíveis"}
              </p>

              {!isLoading && motivoPrincipal && (
                <div className="mt-3 space-y-2">
                  <p className="text-[25px] 2xl:text-[27px] leading-tight font-bold tracking-tight tabular-nums text-foreground">
                    {motivoPrincipal.value.toLocaleString("pt-BR")}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ocorrências
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {participacaoMotivo.toFixed(1).replace(".", ",")}%
                    das perdas nos funis selecionados
                  </p>
                  <div className="cs-bars-v1-participation"
                       role="meter"
                       aria-label="Participação do principal motivo de perda"
                       aria-valuemin={0}
                       aria-valuemax={100}
                       aria-valuenow={Math.max(0, Math.min(100, Number(participacaoMotivo) || 0))}>
                    <div
                      className="cs-bars-v1-participation-fill"
                      style={{ width: `${Math.max(0, Math.min(100, Number(participacaoMotivo) || 0))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* cs-intel-prototipo-v29: donut com participacao real do principal motivo */}
            <div className="cs-intel-v29-media cs-intel-v29-donut" aria-hidden="true">
              <svg viewBox="0 0 80 80" role="presentation">
                <circle cx="40" cy="40" r="25" fill="none" stroke="#273648" strokeWidth="11"/>
                <circle cx="40" cy="40" r="25" fill="none" stroke="#F7304E"
                  strokeWidth="11" strokeLinecap="butt" pathLength="100"
                  strokeDasharray={`${participacaoMotivo} ${100 - participacaoMotivo}`}
                  transform="rotate(-90 40 40)"/>
                <circle cx="40" cy="40" r="13" fill="#131E2C"/>
              </svg>
            </div>
<span className="mt-5 inline-flex text-sm font-semibold text-primary transition-colors">
              Ver motivos
            </span>
          </button>
        </div>
        </div>

        <h3 className="cs-intel-v25-heading cs-intel-v28-subheading">Diagnóstico comercial</h3>

        {/* cs-dash-responsive-executivo-v2-5 */}
        <div className="cs-intel-v25-diagnostics cs-diag-v30-layout grid items-start gap-4 cs-diag-v70-board">
        {/* cs-dash-inteligencia-vinculos-v1-3 */}
        <VinculosHistoricoExecutivoV32
          supabase={supabase as any}
          inicioPagina={start}
          fimPagina={end}
          pipelineIdsFiltrados={pipelineIdsFiltrados}
          todosFunisSelecionados={todosFunisSelecionados}
          funis={filterFunis.length ? filterFunis.join(", ") : "Todos os funis"}
          resultadoPagina={diagnosticoVinculosV11}
          carregandoPagina={
            loadingMqlDiario || loadingPropostasResumo ||
            fetchingMqlV12 || fetchingPropostasV12
          }
          erroPagina={erroMqlV12 || erroPropostasV12}
          filtrosVendasAtivos={
            filterProduto !== "Todos" ||
            filterCampanha !== "Todos" ||
            filterOrigem !== "Todos"
          }
        />

        {/* cs-dash-saude-carteira-v1-4 */}
        <SaudeCarteiraComercialV14 funis={filterFunis} />
        </div>

        <div className="cs-intel-v28-queries cs-intel-v34-queries flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Consultas adicionais:
          </span>

          {([
            ["conversoes", "KPIs de Conversão"],
            ["showup", "Show-up Histórico"],
            ["funil", "Funil de Conversão"],
          ] as const).map(([id, nome]) => (
            <button
              key={id}
              type="button"
              aria-pressed={inteligenciaSelecionada === id}
              onClick={() => setInteligenciaSelecionada(
                v => v === id ? null : id
              )}
              className="rounded-lg border border-border/70 px-3 py-1.5
                text-xs text-muted-foreground transition-colors
                hover:border-primary/40 hover:text-foreground
                aria-pressed:border-primary/60
                aria-pressed:text-primary"
            >
              {nome}
            </button>
          ))}
        </div>

        {inteligenciaSelecionada !== null && (
          <div className="cs-intel-v28-detail cs-intel-v34-detail min-w-0 space-y-3 border-t
            border-border/60 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Consulta detalhada
              </p>
              <button
                type="button"
                onClick={() => setInteligenciaSelecionada(null)}
                className="text-xs font-semibold text-primary
                  hover:underline"
              >
                Fechar análise
              </button>
            </div>

            {inteligenciaSelecionada === "meta" && (
              <MetaXVendidoFunil />
            )}

            {inteligenciaSelecionada === "perdas" && (
              <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-3.5 w-3.5" /> Motivos de Perda (histórico)
          </h3>
          {isLoading ? <ChartSkeleton /> : motivosData.length > 0 ? (() => {
            const total = motivosData.reduce((s, d) => s + d.value, 0);
            const MOTIVO_COLORS = ["#C8102E","#E8384F","#FF6B6B","#FF8E8E","#FFB4B4","#991B1B","#FCA5A5","#be123c","#e11d48","#fb7185"];
            return (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Donut sem labels inline */}
                <div className="flex-shrink-0 w-[180px] h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {MOTIVO_COLORS.map((c, i) => (
                          <linearGradient key={i} id={`gradPie2_${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={c} stopOpacity={1} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie data={motivosData} cx="50%" cy="50%" outerRadius={80} innerRadius={44} dataKey="value" startAngle={90} endAngle={-270}>
                        {motivosData.map((_, i) => <Cell key={i} fill={`url(#gradPie2_${i % MOTIVO_COLORS.length})`} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 50 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Lista ranking */}
                <div className="flex-1 w-full space-y-1.5 min-w-0">
                  {motivosData.slice(0, 8).map((d, i) => {
                    const pct = ((d.value / total) * 100).toFixed(0);
                    const cor = MOTIVO_COLORS[i % MOTIVO_COLORS.length];
                    return (
                      <div key={d.name} className="flex items-center gap-2 group">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-foreground/80 truncate pr-2">{d.name}</span>
                            <span className="text-[11px] font-bold text-foreground/60 flex-shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cor }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 w-6 text-right">{d.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Nenhum lead perdido no período</div>
          )}
        </GlassCard>
            )}

            {inteligenciaSelecionada === "produto" && (
              <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Receita por Produto</h3>
          {isLoading ? <ChartSkeleton /> : produtoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, produtoData.length * 40)}>
              <BarChart data={produtoData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="#E8384F" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>
            )}

            {inteligenciaSelecionada === "segmento" && (
              <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Receita por Segmento</h3>
          {isLoading ? <ChartSkeleton /> : segmentoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, segmentoData.length * 40)}>
              <BarChart data={segmentoData} layout="vertical" margin={{ left: 20 }}>
                <defs>
                  <linearGradient id="gradBarSegmento" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#991B1B" />
                    <stop offset="100%" stopColor="#E8384F" />
                  </linearGradient>
                </defs>
                <XAxis type="number" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="url(#gradBarSegmento)" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>
            )}

            {inteligenciaSelecionada === "conversoes" && (
              <div className="space-y-3">
                {/* Conversion KPIs from metricas_diarias */}
      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Percent className="h-3.5 w-3.5" /> KPIs de Conversão (Input Diário)
        </h2>
        
{/* cs-scorecards-v36: conversao */}
<div className="cs-v36-board"
     role="group"
     aria-label="Indicadores de conversão">
  {isLoading ? Array.from({ length: 4 }).map((_, i) => (
    <Skeleton key={i} className="cs-v36-skeleton" />
  )) : (
    <>
      <div className="cs-v36-metric"
        data-tone={
          totalMQLDiarios <= 0 ? "neutral" :
          pctAgendamento >= 50 ? "positive" : "negative"
        }>
        <span className="cs-v36-name">AGENDAMENTO</span>
        <strong>
          {pctAgendamento.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}%
        </strong>
        <span className="cs-v36-meta">
          Meta 50% · {totalAgendadas}/{totalMQLDiarios}
        </span>
        <small>
          {totalMQLDiarios <= 0
            ? "Sem base de cálculo"
            : pctAgendamento >= 50
              ? "Dentro da meta" : "Abaixo da meta"}
        </small>
      </div>

      <div className="cs-v36-metric"
        data-tone={
          totalAgendadas <= 0 ? "neutral" :
          pctShowUpDiario >= 70 ? "positive" : "negative"
        }>
        <span className="cs-v36-name">SHOW-UP</span>
        <strong>
          {pctShowUpDiario.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}%
        </strong>
        <span className="cs-v36-meta">
          Meta 70% · {totalCompareceramDiarios}/{totalAgendadas}
        </span>
        <small>
          {totalAgendadas <= 0
            ? "Sem base de cálculo"
            : pctShowUpDiario >= 70
              ? "Dentro da meta" : "Abaixo da meta"}
        </small>
      </div>

      <div className="cs-v36-metric" data-tone="neutral">
        <span className="cs-v36-name">
          CONVERSÃO DA SAFRA
        </span>
        <strong>
          {pctLeadVenda.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}%
        </strong>
        <span className="cs-v36-meta">
          {fechadasSafra.length} de {totalLeadsDiarios} leads
        </span>
        <small>Sem meta configurada</small>
      </div>

      <div className="cs-v36-metric" data-tone="neutral">
        <span className="cs-v36-name">
          LEADS RECEBIDOS
        </span>
        <strong>
          {totalLeadsDiarios.toLocaleString("pt-BR")}
        </strong>
        <span className="cs-v36-meta">
          {totalMQLDiarios.toLocaleString("pt-BR")} MQLs
        </span>
        <small>Volume do período</small>
      </div>
    </>
  )}
</div>
        <AIAnalysisButton section="KPIs de Conversão" dataPayload={{
          periodo: PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period,
          pct_agendamento: `${formatarPctCS(pctAgendamento)} (meta: 50%)`,
          pct_showup: `${formatarPctCS(pctShowUpDiario)} (meta: 70%)`,
          conversao_safra: `${formatarPctCS(pctLeadVenda)}`,
          total_leads_diarios: totalLeadsDiarios,
          mql_diarios: totalMQLDiarios,
          vendas_da_safra: fechadasSafra.length,
        }} />
      </div>


      
              </div>
            )}

            {/* cs-intel-consultas-v34: Show-up historico */}
            {inteligenciaSelecionada === "showup" && (
              <GlassCard className="cs-intel-v34-plot cs-intel-v34-showup">
                <h3 className="cs-intel-v34-chart-title">
                  <Users className="h-4 w-4" /> Show-up histórico
                </h3>
                <p className="cs-intel-v34-chart-desc">
                  Reuniões confirmadas pelo SDR e comparecimentos por dia.
                </p>
                {/* cs-intel-consultas-v35: volumes reais do recorte do Show-up */}
                {!isLoading && showUpData.length > 0 && (
                  <div className="cs-intel-v35-showup-summary" aria-label="Totais do histórico de reuniões">
                    <span>
                      <i className="cs-intel-v35-dot cs-intel-v35-dot-confirm" aria-hidden="true" />
                      <strong>{showUpData.reduce((s, d) => s + Number(d.Confirmado ?? 0), 0).toLocaleString("pt-BR")}</strong>
                      Confirmados SDR
                    </span>
                    <span>
                      <i className="cs-intel-v35-dot cs-intel-v35-dot-real" aria-hidden="true" />
                      <strong>{showUpData.reduce((s, d) => s + Number(d.Real ?? 0), 0).toLocaleString("pt-BR")}</strong>
                      Compareceram
                    </span>
                  </div>
                )}
                {isLoading ? (
                  <ChartSkeleton height={210} />
                ) : showUpData.length > 0 ? (
                  <div className="cs-intel-v34-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={showUpData}
                        barCategoryGap="42%"
                        barGap={5}
                        margin={{ top: 8, right: 14, bottom: 5, left: -14 }}
                      >
                        <CartesianGrid vertical={false} stroke="#29384A" strokeDasharray="3 5" />
                        <XAxis
                          dataKey="data"
                          axisLine={false}
                          tickLine={false}
                          minTickGap={20}
                          tick={{ fill: "#98ACC4", fontSize: 10 }}
                          tickFormatter={(valor) => {
                            const data = String(valor);
                            return data.length >= 10
                              ? `${data.slice(8, 10)}/${data.slice(5, 7)}`
                              : data;
                          }}
                        />
                        <YAxis
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                          tick={{ fill: "#98ACC4", fontSize: 10 }}
                        />
                        <Tooltip
                          cursor={false}
                          contentStyle={{
                            backgroundColor: "#101B29",
                            border: "1px solid #36485F",
                            borderRadius: 9,
                            color: "#EDF4FC",
                            boxShadow: "0 12px 26px rgba(0,0,0,.36)",
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "#E4EDF7", fontWeight: 700 }}
                          itemStyle={{ color: "#CCDCEE" }}
                          labelFormatter={(valor) => {
                            const data = String(valor);
                            return data.length >= 10
                              ? `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`
                              : data;
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={7}
                          wrapperStyle={{ fontSize: 11, color: "#B4C6DA", paddingTop: 5 }}
                        />
                        <Bar
                          dataKey="Confirmado"
                          name="Confirmados SDR"
                          fill="#638BB1"
                          maxBarSize={28}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                        <Bar
                          dataKey="Real"
                          name="Compareceram"
                          fill="#13BFA2"
                          maxBarSize={28}
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="cs-intel-v34-empty">Sem dados no período</div>
                )}
              </GlassCard>
            )}

            {/* cs-intel-consultas-v34: resumo de funil, distinto do Funil XPTO */}
            {inteligenciaSelecionada === "funil" && (
              <GlassCard className="cs-intel-v34-plot cs-intel-v34-funnel">
                <h3 className="cs-intel-v34-chart-title">
                  <BarChart3 className="h-4 w-4" /> Etapas do período
                </h3>
                <p className="cs-intel-v34-chart-desc">
                  Volume registrado em quatro marcos comerciais.
                </p>
                {isLoading ? (
                  <ChartSkeleton height={180} />
                ) : funnelData[0]?.value > 0 ? (
                  <div className="cs-intel-v34-funnel-rows">
                    {funnelData.map((stage, i) => {
                      const baseLeads = Number(funnelData[0].value);
                      const valor = Number(stage.value);
                      const participacao = baseLeads > 0 ? (valor / baseLeads) * 100 : 0;
                      const cores = ["#F7304E", "#E99124", "#15A779", "#8A3DC7"];
                      const cor = cores[i % cores.length];
                      return (
                        <div className="cs-intel-v34-funnel-row" key={stage.name}>
                          <div className="cs-intel-v34-funnel-header">
                            <span className="cs-intel-v34-stage-name">
                              <i aria-hidden="true" style={{ background: cor }} />
                              {stage.name}
                            </span>
                            <strong>{valor.toLocaleString("pt-BR")}</strong>
                          </div>
                          <div className="cs-intel-v34-funnel-track">
                             <span
                               className="cs-intel-v34-funnel-fill-v1"
                               style={{
                                 width: `${Math.max(0, Math.min(100, participacao))}%`,
                                 backgroundColor: cor,
                                 color: cor,
                               }}
                             >
                               {participacao >= 25 && (
                                 <strong className="cs-intel-v34-funnel-label-v1">
                                   {participacao.toFixed(1).replace(".", ",")}%
                                 </strong>
                               )}
                             </span>
                           </div>
                          <span className="cs-intel-v34-funnel-share">
                            {participacao.toFixed(1).replace(".", ",")}% do volume de leads
                          </span>
                        </div>
                      );
                    })}
                    <p className="cs-intel-v34-funnel-note">
                      Etapas com fontes e datas próprias; percentuais relativos ao volume
                      de leads, não conversão de uma mesma safra. O Funil XPTO permanece
                      na análise comercial completa.
                    </p>
                  </div>
                ) : (
                  <div className="cs-intel-v34-empty">Sem dados no período</div>
                )}
              </GlassCard>
            )}
          </div>
        )}

        <details className="cs-intel-v35-source-notes">
          <summary>Fontes e períodos dos indicadores</summary>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
          Receitas: vendas fechadas no período selecionado. Motivos de Perda: histórico dos funis selecionados. Meta x Vendido: mês atual. As consultas existentes permanecem disponíveis.
          Selecione um assunto para consultar seus dados completos.
          As análises Geográfico e Funil XPTO continuam em
          Análises e Detalhes.
          </p>
        </details>
      </section>

        </section>
        <details className="cs-overview-v29-marketing cs-layout-v41-marketing">
          <summary className="cs-section-title">Eficiência de Marketing
            <span className="cs-intel-v35-marketing-closed">Expandir indicadores</span>
            <span className="cs-intel-v35-marketing-open">Recolher indicadores</span>
          </summary>
          <div className="space-y-5 p-4">

      {/* Marketing KPIs */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <BadgeDollarSign className="h-3.5 w-3.5" /> Eficiência de Marketing
        </h2>
        
{/* cs-scorecards-v36: marketing */}
<div className="cs-v36-marketing"
     role="group"
     aria-label="Indicadores de eficiência de marketing">
  {isLoading ? Array.from({ length: 3 }).map((_, i) => (
    <Skeleton key={i} className="cs-v36-skeleton" />
  )) : (
    <>
      <div className="cs-v36-metric" data-tone="neutral">
        <span className="cs-v36-name">
          CUSTO DE AQUISIÇÃO · CAC
        </span>
        <strong>
          {cac.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0
          })}
        </strong>
        <span className="cs-v36-meta">
          Custo por aquisição
        </span>
      </div>

      <div className="cs-v36-metric" data-tone="neutral">
        <span className="cs-v36-name">
          CUSTO POR LEAD · CPL
        </span>
        <strong>
          {cpl.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0
          })}
        </strong>
        <span className="cs-v36-meta">
          {totalLeadsPagos.toLocaleString("pt-BR")} leads via Ads
        </span>
      </div>

      <div className="cs-v36-metric"
        data-tone={
          roi > 0 ? "positive" :
          roi < 0 ? "negative" : "neutral"
        }>
        <span className="cs-v36-name">ROI REAL</span>
        <strong>
          {roi.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}%
        </strong>
        <span className="cs-v36-meta">
          {roi > 0 ? "Resultado positivo" :
           roi < 0 ? "Resultado negativo" :
           "Resultado neutro"}
        </span>
      </div>

      <div className="cs-v36-marketing-foot">
        <span>SHOW-UP RATE</span>
        <strong>
          {showUpRate.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          })}%
        </strong>
        <span>
          {totalReal.toLocaleString("pt-BR")}/
          {totalConfirmado.toLocaleString("pt-BR")} reuniões
        </span>
      </div>
    </>
  )}
</div>
      </div>

                  </div>
        </details>
      </div>
    </div>
  );
}
