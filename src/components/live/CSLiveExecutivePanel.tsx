// cs-live-executivo-glass-v2
// Visual do prototipo CS Live com fontes reais do projeto; sem fundos fotograficos.
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowLeft, CalendarDays, CheckCircle2, Crown,
  Maximize2, Minimize2, Radio,
  ShoppingCart, Target, TrendingUp, Users, Zap, Facebook, Instagram, MessageCircle, Mail,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMetricasDiarias } from "@/hooks/useMetricasDiarias";
import { FUNIL_CORES, PIPELINE_IDS } from "@/lib/funis";
import { distribuirOrigens } from "@/lib/origensLeads";
import "@/styles/csLiveExecutiveV2.css";
import "@/styles/csLiveHeaderFeedExecutiveV6.css";
import "@/styles/csLivePrototipoExecutivoV7.css";
import "@/styles/csLiveFidelidadeV8.css";
import "@/styles/csPulsoEstrutural.css";

type Sale = {
  id: string;
  status: string;
  valor: number;
  data_fechamento: string | null;
  produto: string | null;
  funil: string | null;
  updated_at: string;
  created_at: string;
};

type CsLiveCrmDados = {
  leads: Array<{ deal_id: string; pipeline_id: string | null; rating: number | null; created_at: string }>;
  reunioes: Array<{ id: string; pipeline_id: string | null; data: string; compareceu: boolean; created_at: string }>;
};
type CsLiveMql = {
  deal_id: string;
  funil: string | null;
  rating: number | null;
  qualificado_em: string | null;
};
type CsLiveOrigem = { deal_id: string; origem: string | null; pipeline_id: string | null; lead_created_at: string };
type CsLiveFeedEvent = {
  id: string;
  kind: "sale" | "lead" | "meeting" | "showup";
  stamp: string;
  headline: string;
  detail: string;
  note: string;
  amount?: number;
};

type Props = {
  vendas: Sale[];
  vendasReady: boolean;
  leadsHoje: Record<string, number>;
  funis: string[];
  filterFunis: string[];
  toggleFunil: (name: string) => void;
  faturamento: number;
  totalVendas: number;
  meta: number;
  pctMeta: number;
  pulse: boolean;
  hoje: string;
  monthStart: string;
  monthEnd: string;
  testarVenda: () => void;
  testarMeta: () => void;
};

const brl = (v: number) => v.toLocaleString("pt-BR", {
  style: "currency", currency: "BRL", maximumFractionDigits: 0,
});
const inteiro = (v: number) => v.toLocaleString("pt-BR");
const color = (name: string) => FUNIL_CORES[name] ?? "#a2b1c6";

// Ícones sólidos do protótipo, restritos à apresentação visual; sem mudar as métricas.
function PulsoGlyph({ step }: { step: number }) {
  const base = { viewBox: "0 0 32 32", width: 32, height: 32, fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true as const };
  if (step === 0) return <svg {...base}>
    <circle cx="16" cy="10" r="5" fill="currentColor" />
    <path d="M6 27c0-5.8 3.7-9.2 10-9.2S26 21.2 26 27v1H6z" fill="currentColor" />
    <circle cx="5.2" cy="13" r="3.1" fill="currentColor" opacity=".9" />
    <path d="M1 26c0-4 1.7-6.4 4.8-7.1 1.2 0 2.3.2 3.2.7-2.1 1.8-3.4 4.1-3.7 7.4H1z" fill="currentColor" opacity=".9" />
    <circle cx="26.8" cy="13" r="3.1" fill="currentColor" opacity=".9" />
    <path d="M31 26c0-4-1.7-6.4-4.8-7.1-1.2 0-2.3.2-3.2.7 2.1 1.8 3.4 4.1 3.7 7.4H31z" fill="currentColor" opacity=".9" />
  </svg>;
  if (step === 1) return <svg {...base}>
    <circle cx="16" cy="9.2" r="6.1" fill="currentColor" />
    <path d="M4.1 28.2c.1-8.4 4.3-12.6 11.9-12.6s11.8 4.2 11.9 12.6H4.1z" fill="currentColor" />
  </svg>;
  if (step === 2) return <svg {...base}>
    <rect x="3.6" y="6.2" width="24.8" height="22.2" rx="3.8" fill="currentColor" />
    <path d="M3.6 12.2h24.8" stroke="#27101a" strokeWidth="2.1" />
    <path d="M10.2 3.4v6.5M21.8 3.4v6.5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    <g fill="#37131f"><rect x="8" y="15.6" width="4.1" height="3.5" rx=".6"/><rect x="14" y="15.6" width="4.1" height="3.5" rx=".6"/><rect x="20" y="15.6" width="4.1" height="3.5" rx=".6"/><rect x="8" y="21" width="4.1" height="3.5" rx=".6"/><rect x="14" y="21" width="4.1" height="3.5" rx=".6"/></g>
  </svg>;
  if (step === 3) return <svg {...base}>
    <rect x="3.6" y="3.5" width="24.8" height="24.8" rx="6" fill="currentColor" />
    <path d="m9.9 15.8 4.4 4.3 8.3-8.6" stroke="#330c1d" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
  return <svg {...base}>
    <path d="M3 6h4.1l3.8 17.2h15l3-12.2H9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.8 11h17.5l-2.7 10.7H13.1z" fill="currentColor" opacity=".92" />
    <circle cx="14" cy="27" r="2.4" fill="currentColor"/><circle cx="25.6" cy="27" r="2.4" fill="currentColor" />
  </svg>;
}

function RevenueChart({ sales, first, last }: { sales: Sale[]; first: string; last: string }) {
  const geometry = useMemo(() => {
    const year = Number(first.slice(0, 4));
    const month = Number(first.slice(5, 7));
    const until = Math.max(1, Math.min(Number(last.slice(8, 10)), new Date().getDate()));
    const daily: Record<string, number> = {};
    sales.forEach(v => {
      if (v.data_fechamento) daily[v.data_fechamento] = (daily[v.data_fechamento] ?? 0) + Number(v.valor);
    });
    const values: number[] = [0];
    let sum = 0;
    for (let day = 1; day <= until; day++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      sum += daily[date] ?? 0;
      values.push(sum);
    }
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => [10 + (i / Math.max(1, values.length - 1)) * 460, 107 - (v / max) * 88]);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const area = `${line} L470 114 L10 114 Z`;
    return { line, area, last: pts[pts.length - 1] };
  }, [sales, first, last]);

  return (
    <svg className="cs-live-v2__revenue-chart" viewBox="0 0 480 120" preserveAspectRatio="none" role="img" aria-label="Evolucao acumulada do faturamento no mes">
      <defs>
        <linearGradient id="cs-live-v2-chart-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f7304e" stopOpacity=".26" />
          <stop offset="100%" stopColor="#f7304e" stopOpacity="0" />
        </linearGradient>
        <filter id="cs-live-v8-dot-glow" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <path d={geometry.area} fill="url(#cs-live-v2-chart-area)" />
      <path d={geometry.line} fill="none" stroke="#F7304E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={geometry.last[0]} cy={geometry.last[1]} r="11" fill="#F7304E" opacity=".8" filter="url(#cs-live-v8-dot-glow)" />
      <circle cx={geometry.last[0]} cy={geometry.last[1]} r="4.4" fill="#fff5f7" stroke="#F7304E" strokeWidth="2.1" />
    </svg>
  );
}

export default function CSLiveExecutivePanel({
  vendas, vendasReady, leadsHoje, funis, filterFunis, toggleFunil,
  faturamento, totalVendas, meta, pctMeta, pulse, hoje,
  monthStart, monthEnd, testarVenda, testarMeta,
}: Props) {
  const [clock, setClock] = useState(() => new Date());
  const [tv, setTv] = useState(false);
  const [allFunis, setAllFunis] = useState(false);
  const [feedPeriod, setFeedPeriod] = useState<"today" | "recent">("today");
  const { data: metricas = [], isSuccess: metricasReady } = useMetricasDiarias();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    const onFull = () => setTv(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("fullscreenchange", onFull);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["metricas_diarias"] });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [queryClient]);

  async function toggleTV() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Em alguns navegadores o fullscreen depende da permissao local.
    }
  }

  const selected = (name: string | null) => filterFunis.length === 0 || (!!name && filterFunis.includes(name));
  // cs-live-v8: mesmas tabelas do Funil XPTO; consulta limitada ao dia, sem eventos ficticios.
  const { data: crmDados, isSuccess: crmReady, isError: crmError } = useQuery<CsLiveCrmDados>({
    queryKey: ["cs-live-crm-diario-v8", hoje],
    queryFn: async () => {
      const inicio = new Date(`${hoje}T00:00:00`);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
      const [leadsResult, reunioesResult] = await Promise.all([
        supabase.from("leads_geografia")
          .select("deal_id,pipeline_id,rating,created_at")
          .eq("deletado", false)
          .gte("created_at", inicio.toISOString())
          .lt("created_at", fim.toISOString())
          .order("created_at", { ascending: false })
          .limit(1500),
        supabase.from("reunioes_agendadas")
          .select("id,pipeline_id,data,compareceu,created_at")
          .eq("data", hoje)
          .order("created_at", { ascending: false })
          .limit(1500),
      ]);
      if (leadsResult.error) throw leadsResult.error;
      if (reunioesResult.error) throw reunioesResult.error;
      return { leads: leadsResult.data ?? [], reunioes: reunioesResult.data ?? [] };
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
  // cs-live-mql-qualificado-no-dia-v1
  // deals_sdr_tracking.qualificado_em preserva a data em que o negocio foi qualificado.
  // Mesmo fuso do painel: America/Sao_Paulo, inclusivo no inicio e exclusivo no fim.
  const { data: mqlDados = [], isSuccess: mqlReady } = useQuery<CsLiveMql[]>({
    queryKey: ["cs-live-mql-qualificados-v1", hoje],
    queryFn: async () => {
      const inicio = new Date(`${hoje}T00:00:00-03:00`);
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
      // Tabela existente no Supabase, possivelmente nao incluida no types.ts gerado.
      const { data, error } = await (supabase as any).from("deals_sdr_tracking")
        .select("deal_id,funil,rating,qualificado_em")
        .gte("qualificado_em", inicio.toISOString())
        .lt("qualificado_em", fim.toISOString())
        .in("rating", [3, 5])
        .order("qualificado_em", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as CsLiveMql[];
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const selectedPipelineIds = new Set(filterFunis.map(f => PIPELINE_IDS[f]).filter(Boolean));
  const pipelineSelected = (id: string | null) => filterFunis.length === 0 || (!!id && selectedPipelineIds.has(id));
  // O created_at de leads_geografia pode ser a data da sincronizacao, nao a criacao no CRM.
  // Mongo ObjectId: os primeiros 8 caracteres hex representam a data de geracao em UTC.
  // Sem um ID valido, nao afirmar "Novo lead"; o registro deve ser auditado na origem.
  const leadsCrmDataOriginalHoje = useMemo(() => {
    const vistos = new Set<string>();
    const formato = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    });
    return (crmDados?.leads ?? []).filter(r => {
      const id = r.deal_id ?? "";
      if (!/^[0-9a-f]{24}$/i.test(id) || vistos.has(id)) return false;
      const criacao = new Date(Number.parseInt(id.slice(0, 8), 16) * 1000);
      if (Number.isNaN(criacao.getTime())) return false;
      const partes = Object.fromEntries(formato.formatToParts(criacao).map(p => [p.type, p.value]));
      if (`${partes.year}-${partes.month}-${partes.day}` !== hoje) return false;
      vistos.add(id);
      return true;
    });
  }, [crmDados, hoje]);
  const leadsCrmHoje = leadsCrmDataOriginalHoje.filter(r => pipelineSelected(r.pipeline_id));
  const reunioesCrmHoje = (crmDados?.reunioes ?? []).filter(r => pipelineSelected(r.pipeline_id));
  // MQL = evento de qualificacao no dia (nao criacao de lead no dia).
  // Deduplicacao por deal_id; mantem rating atual 3 OU 5, conforme regra existente.
  const funilNormalizadoMql = (nome: string | null) =>
    (nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const funisSelecionadosMql = new Set(filterFunis.map(funilNormalizadoMql));
  const mqlCrmHoje = new Set(
    mqlDados.filter(r =>
      filterFunis.length === 0 || funisSelecionadosMql.has(funilNormalizadoMql(r.funil))
    ).map(r => r.deal_id)
  ).size;
  const showupCrmHoje = reunioesCrmHoje.filter(r => r.compareceu === true).length;

  // Base da distribuicao = negocios do CRM ja contados acima; a view so informa a origem de cada deal_id.
  // Negocio sem registro na view (ou com origem vazia/Desconhecido) conta como origem nao identificada.
  const dealIdsHoje = useMemo(
    () => leadsCrmDataOriginalHoje.map(r => r.deal_id ?? "").filter(Boolean).sort(),
    [leadsCrmDataOriginalHoje]
  );
  const { data: origensDados = [], isSuccess: origensReady, isError: origensError } = useQuery<CsLiveOrigem[]>({
    queryKey: ["cs-live-origens-por-deal-v9", hoje, dealIdsHoje.join(",")],
    enabled: crmReady,
    queryFn: async () => {
      // View ainda nao declarada no types.ts gerado; consulta em blocos para nao estourar a URL.
      const blocos: string[][] = [];
      for (let i = 0; i < dealIdsHoje.length; i += 100) blocos.push(dealIdsHoje.slice(i, i + 100));
      const respostas = await Promise.all(blocos.map(async ids => {
        const { data, error } = await (supabase as any).from("csdash_origens_resolvidas")
          .select("deal_id,origem,pipeline_id,lead_created_at")
          .in("deal_id", ids);
        if (error) throw error;
        return (data ?? []) as CsLiveOrigem[];
      }));
      return respostas.flat();
    },
    staleTime: 20_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const origensPronto = crmReady && origensReady;
  const origemPorDeal = new Map<string, string | null>();
  for (const r of origensDados) {
    if (!origemPorDeal.has(r.deal_id) || (!origemPorDeal.get(r.deal_id) && r.origem)) origemPorDeal.set(r.deal_id, r.origem);
  }
  const contagemOrigem = distribuirOrigens(leadsCrmHoje.map(r => r.deal_id ?? ""), origemPorDeal);
  const origemTotal = contagemOrigem.total;
  const origemNumero = (nome: "meta" | "instagram" | "whatsapp" | "email") => origensPronto ? inteiro(contagemOrigem[nome]) : "—";
  const origemPct = (nome: "meta" | "instagram" | "whatsapp" | "email") => origemTotal > 0 ? `${(contagemOrigem[nome] / origemTotal * 100).toFixed(0)}%` : "sem base";

  const vendasMes = useMemo(
    () => vendas.filter(v => v.status === "Fechado" && !!v.data_fechamento &&
      v.data_fechamento >= monthStart && v.data_fechamento <= monthEnd && selected(v.funil)),
    // selected depends only on filterFunis; declared inline to keep the source transparent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendas, monthStart, monthEnd, filterFunis]
  );
  const vendasHoje = useMemo(
    () => vendas.filter(v => v.status === "Fechado" && v.data_fechamento === hoje && selected(v.funil)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendas, hoje, filterFunis]
  );

  const metricasHoje = useMemo(() => metricas.filter(m => m.data === hoje && selected(m.funil)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metricas, hoje, filterFunis]);
  const haveMetricas = metricasReady && metricasHoje.length > 0;
  const sumMetric = (field: "leads_qualificados" | "reunioes_agendadas" | "compareceram_real") =>
    haveMetricas ? metricasHoje.reduce((s, m) => s + Number(m[field] ?? 0), 0) : null;

  const leadsFiltrados = funis.filter(f => selected(f));
  const leadsTotal = leadsFiltrados.reduce((s, f) => s + Number(leadsHoje[f] ?? 0), 0);
  const productFunis = [...funis].sort((a, b) => (leadsHoje[b] ?? 0) - (leadsHoje[a] ?? 0));
  const visibleFunis = allFunis ? productFunis : productFunis.slice(0, 6);
  const lider = productFunis.filter(f => selected(f))[0];
  const diasRestantes = Math.max(0, new Date(clock.getFullYear(), clock.getMonth() + 1, 0).getDate() - clock.getDate());
  const falta = Math.max(0, meta - faturamento);
  const necessarioDia = meta > 0 ? falta / Math.max(1, diasRestantes) : 0;
  const metaBatida = meta > 0 && faturamento >= meta;
  const totalMeta = meta > 0 ? pctMeta.toFixed(1).replace(".", ",") : "—";

  const pulso = [
    { label: "Leads", value: leadsTotal, Icon: Users },
    // MQL: negocios qualificados hoje, independentemente do dia de criacao.
    { label: "MQL", value: mqlReady ? mqlCrmHoje : null, Icon: Target },
    // Historico real de reunioes, com a data correspondente a hoje.
    { label: "Agendamentos", value: crmReady ? reunioesCrmHoje.length : sumMetric("reunioes_agendadas"), Icon: CalendarDays },
    { label: "Show-up", value: crmReady ? showupCrmHoje : sumMetric("compareceram_real"), Icon: CheckCircle2 },
    { label: "Vendas", value: vendasReady ? vendasHoje.length : null, Icon: ShoppingCart },
  ];

  const feed = useMemo(() => vendas.filter(v => v.status === "Fechado" && v.data_fechamento &&
     (feedPeriod === "recent" || v.data_fechamento === hoje))
    .sort((a, b) => (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || ""))
    .slice(0, 12),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vendas, filterFunis, feedPeriod, hoje]);

  // O feed e geral, independente dos filtros de funil nos KPIs.
  // Origem por canal e consultada separadamente em leads_origens.
  const feedEvents = useMemo<CsLiveFeedEvent[]>(() => {
    const eventos: CsLiveFeedEvent[] = feed.map(v => ({
      id: `v-${v.id}`, kind: "sale" as const,
      stamp: v.updated_at || v.created_at || `${v.data_fechamento ?? hoje}T00:00:00`,
      headline: "+ " + brl(Number(v.valor)),
      detail: v.produto || v.funil || "Venda fechada",
      note: `Fechamento: ${v.data_fechamento ? v.data_fechamento.split("-").reverse().join("/") : "—"}`,
      amount: Number(v.valor),
    }));
    for (const r of leadsCrmDataOriginalHoje) {
      const f = Object.entries(PIPELINE_IDS).find(([, id]) => id === r.pipeline_id)?.[0];
      eventos.push({
        id: `l-${r.deal_id}`, kind: "lead", stamp: new Date(Number.parseInt(r.deal_id.slice(0, 8), 16) * 1000).toISOString(),
        headline: "Novo lead", detail: f || "Funil nao identificado",
        note: `Negocio ${r.deal_id.slice(0, 8)} · origem nao informada`,
      });
    }
    for (const r of crmDados?.reunioes ?? []) {
      const f = Object.entries(PIPELINE_IDS).find(([, id]) => id === r.pipeline_id)?.[0];
      eventos.push({
        id: `r-${r.id}`, kind: r.compareceu ? "showup" : "meeting",
        stamp: r.created_at || `${hoje}T00:00:00`,
        headline: r.compareceu ? "Show-up registrado" : "Reuniao agendada",
        detail: f || "Funil nao identificado",
        note: `Reuniao prevista em ${r.data.split("-").reverse().join("/")} · registro ${r.id.slice(0, 8)}`,
      });
    }
    return eventos.sort((a, b) => b.stamp.localeCompare(a.stamp)).slice(0, 150);
  }, [feed, crmDados, hoje, leadsCrmDataOriginalHoje]);

  const labelDia = clock.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const labelHora = clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className={`cs-live-v2 ${tv ? "cs-live-v2--tv" : ""}`}>
      <header className="cs-live-v2__topbar">
        <div className="cs-live-v2__brand">
          <span className="cs-live-v2__monogram" aria-hidden="true">C$</span>
          <span className="cs-live-v2__brand-stack"><strong>CS <em>LIVE</em> <i className="cs-live-v2__online" /></strong><small>COSTURANDO SUCESSO</small></span>
        </div>
        <div className="cs-live-v2__top-actions">
          <span className="cs-live-v2__datetime">{labelDia}</span>
          <time className="cs-live-v2__clock">{labelHora}</time>
          <button className="cs-live-v2__tv" type="button" onClick={toggleTV} aria-label={tv ? "Sair do Modo TV" : "Ativar Modo TV"}>
            {tv ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {tv ? "SAIR DO MODO TV" : "MODO TV"}
          </button>
          <Link to="/" className="cs-live-v2__exit"><ArrowLeft size={15} /> Painel</Link>
        </div>
      </header>

      <main className="cs-live-v2__layout">
        <section className="cs-live-v2__primary" aria-label="Indicadores comerciais ao vivo">
          <div className="cs-live-v2__hero">
            <article className="cs-live-v2__panel cs-live-v2__revenue">
              <div className="cs-live-v2__eyebrow"><span className="cs-live-v2__status-dot" /> FATURAMENTO EM TEMPO REAL</div>
              <div className={`cs-live-v2__revenue-value cs-live-revenue-value ${pulse ? "cs-live-value-flash" : ""}`}>
                {vendasReady ? brl(faturamento) : "Carregando..."}
              </div>
              <div className="cs-live-v2__revenue-meta"><TrendingUp size={16} /> Acumulado no mês <strong>{vendasReady ? `${inteiro(totalVendas)} vendas` : "—"}</strong></div>
              <RevenueChart sales={vendasMes} first={monthStart} last={hoje} />
              <div className="cs-live-v2__chart-caption">Evolução real do faturamento acumulado</div>
            </article>

            <article className="cs-live-v2__panel cs-live-v2__goal">
              <div className="cs-live-v2__panel-head"><span className="cs-live-v2__eyebrow">META DO MÊS</span>{metaBatida && <span className="cs-live-v2__goal-achieved"><Crown size={14} /> META ATINGIDA</span>}</div>
              <div className="cs-live-v2__goal-progress"><div className="cs-live-v2__goal-track"><span style={{ width: `${Math.min(100, Math.max(0, pctMeta))}%` }} /></div><strong>{totalMeta}{meta > 0 ? "%" : ""}</strong></div>
              <div className="cs-live-v2__goal-cols"><div><b>{meta > 0 ? brl(meta) : "Não configurada"}</b><small>meta mensal</small></div><div><b>{meta > 0 ? brl(metaBatida ? Math.max(0, faturamento - meta) : falta) : "—"}</b><small>{metaBatida ? "acima da meta" : "para atingir a meta"}</small></div></div>
              <div className="cs-live-v2__goal-secondary"><div><CalendarDays size={20} /><span><strong>{diasRestantes} dias</strong><small>até o fim do mês</small></span></div><div><Target size={20} /><span><strong>{meta > 0 && !metaBatida ? brl(necessarioDia) : metaBatida ? "Concluída" : "—"}</strong><small>necessário por dia</small></span></div></div>
            </article>
          </div>

          {/* Pulso Comercial — geometria e indicadores isolados; fontes reais preservadas. */}
          <section className="cs-live-v2__panel cs-pulso" aria-label="Pulso Comercial de hoje">
            <div className="cs-pulso__header">
              <h2>PULSO COMERCIAL <span>— HOJE</span></h2>
              <span className="cs-pulso__period">Hoje</span>
            </div>
            <div className="cs-pulso__track" role="list" aria-label="Etapas dos indicadores comerciais">
              {pulso.map(({ label, value }, i) => {
                const last = i === pulso.length - 1;
                const shape = last
                  ? "M8 1 H258 Q263 1 263 8 V104 Q263 111 255 111 H8 Q1 111 1 104 V8 Q1 1 8 1 Z"
                  : "M8 1 H218 Q230 1 237 14 L260 48 Q267 56 260 64 L237 98 Q230 111 218 111 H8 Q1 111 1 104 V8 Q1 1 8 1 Z";
                return (
                  <div className={`cs-pulso__stage${last ? " cs-pulso__stage--last" : ""}`} key={label} role="listitem" style={{ zIndex: pulso.length - i }}>
                    <svg className="cs-pulso__shape" viewBox="0 0 264 112" preserveAspectRatio="none" focusable="false" aria-hidden="true">
                      <defs>
                        <linearGradient id={`cp20-base-${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="#1e0b16" />
                          <stop offset=".24" stopColor="#170b14" />
                          <stop offset=".61" stopColor="#0d0a12" />
                          <stop offset="1" stopColor="#070a10" />
                        </linearGradient>
                        <radialGradient id={`cp20-ambient-${i}`} cx=".18" cy=".27" r=".73">
                          <stop offset="0" stopColor="#ee2149" stopOpacity=".15" />
                          <stop offset=".42" stopColor="#ec224a" stopOpacity=".048" />
                          <stop offset="1" stopColor="#ec224a" stopOpacity="0" />
                        </radialGradient>
                        <linearGradient id={`cp20-nose-${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0" stopColor="#e9214c" stopOpacity="0" />
                          <stop offset=".52" stopColor="#d6173c" stopOpacity=".16" />
                          <stop offset=".81" stopColor="#f22b51" stopOpacity={i === 0 ? ".59" : ".36"} />
                          <stop offset="1" stopColor="#f32b50" stopOpacity={i === 0 ? ".85" : ".60"} />
                        </linearGradient>
                        <filter id={`cp20-glow-${i}`} x="-90%" y="-60%" width="280%" height="220%"><feGaussianBlur stdDeviation="5" /></filter>
                      </defs>
                      <path d={shape} fill={`url(#cp20-base-${i})`} stroke="#e82e4e" strokeOpacity={i === 0 ? ".17" : ".075"} strokeWidth=".75" />
                      <path d={shape} fill={`url(#cp20-ambient-${i})`} />
                      {!last && <>
                        <path d="M218 1 Q230 1 237 14 L260 48 Q267 56 260 64 L237 98 Q230 111 218 111 L228 89 L251 56 L228 23 Z" fill={`url(#cp20-nose-${i})`} />
                        <path d="M236 11 L259 48 Q266 56 259 64 L236 101" fill="none" stroke="#ff315c" strokeOpacity={i === 0 ? ".54" : ".34"} strokeWidth="4" filter={`url(#cp20-glow-${i})`} />
                        <path d="M236 11 L260 48 Q267 56 260 64 L236 101" fill="none" stroke="#f7304e" strokeOpacity={i === 0 ? ".31" : ".20"} strokeWidth="1.1" />
                        <path d="M250 52 L254 56 L250 60" fill="none" stroke="#f3e7ec" strokeOpacity=".93" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </>}
                    </svg>
                    <div className="cs-pulso__content">
                      <span className="cs-pulso__icon" aria-hidden="true"><PulsoGlyph step={i} /></span>
                      <span className="cs-pulso__metric">
                        <strong>{value === null ? "—" : inteiro(value)}</strong>
                        <span className="cs-pulso__metric-label">{label}</span>
                        <span className="cs-pulso__trend-slot" title="Comparativo histórico indisponível">—</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="cs-pulso__source">Leads: registro diário por funil. MQL: negócios qualificados hoje (rating atual 3 ou 5). Agendamentos e show-up: histórico de reuniões do dia. {crmReady ? "Fonte: CRM sincronizado." : haveMetricas ? "Fonte alternativa: input diário." : "Sem fonte de reuniões disponível."} Etapas não representam a mesma safra.</p>
          </section>

          <section className="cs-live-v2__products">
            <div className="cs-live-v2__section-head"><h2>LEADS POR FUNIL <span>— HOJE</span></h2>{productFunis.length > 6 && <button type="button" onClick={() => setAllFunis(s => !s)}>{allFunis ? "Mostrar seis" : `Ver todos (${productFunis.length})`}</button>}</div>
            <div className="cs-live-v2__product-grid">
              {visibleFunis.map(funil => {
                const count = Number(leadsHoje[funil] ?? 0);
                const sales = vendasHoje.filter(v => v.funil === funil).length;
                const active = filterFunis.includes(funil);
                return <button data-funil={funil} className={`cs-live-v2__product ${active ? "cs-live-v2__product--active" : ""}`} key={funil} type="button" onClick={() => toggleFunil(funil)} aria-pressed={active} style={{ "--cs-live-funil": color(funil) } as CSSProperties}>
                  <span className="cs-live-v2__product-name"><i />{funil}</span>
                  <span className="cs-live-v2__product-totals"><span><strong>{inteiro(count)}</strong> leads</span><span><strong>{inteiro(sales)}</strong> {sales === 1 ? "venda" : "vendas"}</span></span>
                </button>;
              })}
            </div>
            {filterFunis.length > 0 && <button type="button" className="cs-live-v2__clear-filter" onClick={() => filterFunis.forEach(toggleFunil)}>Limpar seleção ({filterFunis.length})</button>}
          </section>

          <div className="cs-live-v2__bottom-row">
            <section className="cs-live-v2__panel cs-live-v2__origin">
              <h2>ORIGEM DOS LEADS <span>— HOJE</span></h2>
                            <div className="cs-live-v2__origin-channels" aria-label="Canais de origem sincronizados hoje">
                <div className="cs-live-v2__origin-channel"><span className="cs-live-v2__origin-logo"><Facebook size={18} /></span><strong>{origemNumero("meta")}{origemTotal > 0 && <em>{origemPct("meta")}</em>}</strong><small>Meta/Facebook</small></div>
                <div className="cs-live-v2__origin-channel"><span className="cs-live-v2__origin-logo cs-live-v2__origin-logo--instagram"><Instagram size={18} /></span><strong>{origemNumero("instagram")}{origemTotal > 0 && <em>{origemPct("instagram")}</em>}</strong><small>Instagram</small></div>
                <div className="cs-live-v2__origin-channel"><span className="cs-live-v2__origin-logo cs-live-v2__origin-logo--whatsapp"><MessageCircle size={18} /></span><strong>{origemNumero("whatsapp")}{origemTotal > 0 && <em>{origemPct("whatsapp")}</em>}</strong><small>WhatsApp</small></div>
                <div className="cs-live-v2__origin-channel"><span className="cs-live-v2__origin-logo cs-live-v2__origin-logo--email"><Mail size={18} /></span><strong>{origemNumero("email")}{origemTotal > 0 && <em>{origemPct("email")}</em>}</strong><small>E-mail</small></div>
              </div>
              <small className="cs-live-v2__origin-unavailable">{origensPronto ? `Base: ${inteiro(origemTotal)} leads do CRM · outros canais identificados: ${inteiro(contagemOrigem.outros)} · origem não identificada: ${inteiro(contagemOrigem.naoIdentificada)}${origemTotal > 0 ? ` (${(contagemOrigem.naoIdentificada / origemTotal * 100).toFixed(0)}%)` : ""}.` : (origensError || crmError) ? "Falha ao consultar as origens dos leads; valores indisponíveis." : "Carregando origem real dos leads..."}</small>
            </section>
            <section className="cs-live-v2__panel cs-live-v2__now">
              <h2><Zap size={17} /> AGORA</h2>
              <p>{lider && leadsTotal > 0 ? <><strong>{lider}</strong> concentra <strong>{inteiro(leadsHoje[lider] ?? 0)}</strong> dos <strong>{inteiro(leadsTotal)}</strong> leads registrados nos funis selecionados hoje.</> : "Sem leads registrados nos funis selecionados hoje."}</p>
              {haveMetricas && <small>Input diário: {inteiro(sumMetric("leads_qualificados") ?? 0)} MQLs · {inteiro(sumMetric("reunioes_agendadas") ?? 0)} agendamentos.</small>}
            </section>
          </div>
        </section>

        <aside className="cs-live-v2__panel cs-live-v2__activity" aria-label="Atividade comercial">
          <div className="cs-live-v2__activity-head"><h2>ATIVIDADE COMERCIAL</h2><select aria-label="Período das vendas no feed" value={feedPeriod} onChange={e => setFeedPeriod(e.target.value as "today" | "recent")}><option value="today">Hoje</option><option value="recent">Recentes</option></select></div>
          <div className="cs-live-v2__activity-caption">
            <span className="cs-live-v2__activity-source"><span className="cs-live-v2__status-dot" /> Vendas Realtime · leads e reuniões CRM (30 s)</span>
            <span className="cs-live-v2__activity-count">{vendasReady ? `${inteiro(feedEvents.length)} ${feedEvents.length === 1 ? "registro exibido" : "registros exibidos"}` : "Atualizando"}</span>
          </div>
          <div className="cs-live-v2__feed">
            {!vendasReady ? (
              <p className="cs-live-v2__feed-empty">Carregando registros...</p>
            ) : feedEvents.length === 0 ? (
              <p className="cs-live-v2__feed-empty">Nenhum registro {feedPeriod === "today" ? "hoje" : "nos dados disponiveis"}. {crmError ? "A consulta ao CRM apresentou falha." : ""}</p>
            ) : feedEvents.map(ev => (
              <div key={ev.id} className={`cs-live-v2__feed-item cs-live-v2__feed-item--${ev.kind}`}>
                <span className="cs-live-v2__feed-icon">
                  {ev.kind === "sale" ? <ShoppingCart size={19} /> : ev.kind === "lead" ? <Users size={19} /> : ev.kind === "showup" ? <CheckCircle2 size={19} /> : <CalendarDays size={19} />}
                </span>
                <span className="cs-live-v2__feed-main"><strong>{ev.headline}</strong><span>{ev.detail}</span><small>{ev.note}</small></span>
                <span className="cs-live-v2__feed-type">{ev.kind === "sale" ? "VENDA" : ev.kind === "lead" ? "LEAD" : ev.kind === "showup" ? "SHOW-UP" : "REUNIAO"}</span>
              </div>
            ))}
            {vendasReady && feedPeriod === "today" && feed.length > 0 && feed.length <= 4 && (
              <div className="cs-live-v2__feed-summary">
                <div className="cs-live-v2__feed-summary-label">RESUMO DAS VENDAS CONFIRMADAS · HOJE</div>
                <div className="cs-live-v2__feed-summary-metrics">
                  <div><strong>{inteiro(feed.length)}</strong><small>{feed.length === 1 ? "venda confirmada" : "vendas confirmadas"}</small></div>
                  <div><strong>{brl(feed.reduce((total, venda) => total + (Number(venda.valor) || 0), 0))}</strong><small>valor dos registros exibidos</small></div>
                </div>
                <div className="cs-live-v2__feed-summary-status"><Radio size={13} /> Novos fechamentos serão atualizados automaticamente.</div>
              </div>
            )}
          </div>
          <div className="cs-live-v2__activity-foot"><Radio size={14} /> Vendas via Supabase Realtime. Novos leads: registros de negócios do CRM. Reuniões: agenda do dia; sem horário da reunião na fonte. MQL: qualificação registrada no dia (rating atual 3 ou 5).</div>
        </aside>
      </main>
      {import.meta.env.DEV && <div className="cs-live-v2__qa"><span>TESTES · NÃO REGISTRAM VENDAS</span><button type="button" onClick={testarVenda}><ShoppingCart size={14} /> Testar comemoração</button><button type="button" onClick={testarMeta}><Crown size={14} /> Testar meta batida</button></div>}
    </div>
  );
}

// cs-live-header-feed-executive-v6

// cs-live-fidelidade-e-dados-v8
