import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { GlassCard } from "@/components/GlassCard";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Filter, Users, UserCheck, CalendarCheck, Users2, FileText, TrendingUp,
  AlertTriangle, TrendingDown, Lightbulb,
} from "lucide-react";
import { FunilSVGCore } from "@/components/FunilSVGCore";
import { cn } from "@/lib/utils";
import { PIPELINE_IDS, FUNIL_CORES } from "@/lib/funis";
import { PerformanceSDR } from "@/components/PerformanceSDR";

// ── Business constants (unchanged from 9088d0b) ───────────────────────────
const METAS = {
  leads_para_mql: 35,
  mql_para_reuniao: 70,
  reuniao_para_show: 70,
  show_para_proposta: 70,
  proposta_para_fechado: 30,
};

function getHoje() { return new Date().toISOString().split("T")[0]; }
function getMesInicio() { return getHoje().substring(0, 7) + "-01"; }
function getSemanaAtras() {
  return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

interface FunilData {
  leads: number; leadsPagos: number; mql: number;
  reunioesAgendadas: number; reunioesRealizadas: number;
  propostas: number; fechados: number;
}

const pct = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0;

// Conversion >100% → gray: inter-stage rates can exceed 100% when the two tables
// use different date reference fields (created_at vs data vs data_fechamento).
// Gray signals a potentially inconsistent denominator without hiding the value.
function getStatusColor(real: number, meta: number) {
  if (real > 100) return { bg: "#6b728018", border: "#6b7280", text: "#9ca3af" };
  if (real >= meta) return { bg: "#16a34a18", border: "#16a34a", text: "#4ade80" };
  if (real >= meta * 0.7) return { bg: "#d9770618", border: "#d97706", text: "#fbbf24" };
  return { bg: "#dc262618", border: "#dc2626", text: "#f87171" };
}

function getBarColor(real: number, meta: number): string {
  if (real > 100) return "#6b7280";
  if (real >= meta) return "#16a34a";
  if (real >= meta * 0.7) return "#d97706";
  return "#dc2626";
}

// ── useCountUp ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 700, trigger: boolean) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) { setDisplay(0); return; }
    if (target === 0) { setDisplay(0); return; }
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, trigger, duration]);

  return display;
}

// ── CSS animations ────────────────────────────────────────────────────────
const ANIM_ID = "funil-premium-styles";
function injectStyles() {
  if (document.getElementById(ANIM_ID)) return;
  const s = document.createElement("style");
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes funilBadgeIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes funilKpiIn {
      from { opacity:0; transform:translateY(4px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes barGrow {
      from { width:0; }
    }
  `;
  document.head.appendChild(s);
}

// ── Conversion badge ──────────────────────────────────────────────────────
function ConvBadge({
  conv, animated, delay,
}: {
  conv: { real: number; meta: number; label: string };
  animated: boolean; delay: number;
}) {
  const sc = getStatusColor(conv.real, conv.meta);
  const hasData = conv.real > 0 || conv.meta > 0;
  return (
    <div
      className="flex flex-col items-center"
      style={{
        opacity: animated ? undefined : 0,
        ...(animated ? {
          animation: `funilBadgeIn 0.38s ease both`,
          animationDelay: `${delay}ms`,
        } : {}),
      }}
    >
      {/* Connector vertical tick */}
      <div style={{
        width: 1, height: 8,
        background: `${sc.border}80`,
        flexShrink: 0, marginBottom: 4,
      }} />
      {/* Connector dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: sc.border, flexShrink: 0, marginBottom: 6,
        boxShadow: `0 0 5px ${sc.border}50`,
      }} />
      <div
        style={{
          background: sc.bg,
          border: `1px solid ${sc.border}`,
          borderRadius: 8,
          minWidth: 82,
          padding: '7px 9px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 900, lineHeight: 1, color: sc.text }}>
          {hasData ? `${conv.real.toFixed(1)}%` : 'N/D'}
        </div>
        <div style={{ fontSize: 8.5, lineHeight: 1.3, marginTop: 3, color: sc.text, opacity: 0.75 }}>
          {conv.label}
        </div>
        <div style={{ fontSize: 7.5, lineHeight: 1.3, marginTop: 2, color: 'rgba(255,255,255,0.28)' }}>
          meta {conv.meta}%
        </div>
      </div>
    </div>
  );
}

// ── Horizontal funnel + badges ────────────────────────────────────────────
const SHORT_LABELS = ["Leads", "MQL", "Agend.", "Reuniões", "Propostas", "Vendas"];

function FunilHorizontal({
  etapas, conversoes, loading,
}: {
  etapas: { label: string; val: number; pctDeTopo: number }[];
  conversoes: { real: number; meta: number; label: string }[];
  loading: boolean;
}) {
  const [animated, setAnimated] = useState(false);
  const n = etapas.length;

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => {
    if (!loading) {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(t);
    } else {
      setAnimated(false);
    }
  }, [loading]);

  const stages = etapas.map((e, i) => ({
    label: e.label,
    shortLabel: SHORT_LABELS[i] ?? e.label,
    val: e.val,
    pctDeTopo: e.pctDeTopo,
  }));

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div>
      {/* Scrollable wrapper — SVG + badges share a min-width so badges never overlap */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 560 }}>
          {/* True SVG dynamic funnel */}
          <FunilSVGCore
            stages={stages}
            loading={loading}
            reduceMotion={prefersReduced || !animated}
          />

          {/* Conversion badges — positioned at each stage boundary */}
          <div style={{ position: 'relative', marginTop: 16 }}>
            {/* Dotted connector line */}
            <div style={{
              position: 'absolute',
              top: 3,
              left: `${(1 / n) * 100}%`,
              right: `${(1 / n) * 100}%`,
              borderTop: '1px dashed rgba(120,130,150,0.25)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', height: 78 }}>
              {conversoes.map((conv, i) => {
                const leftPct = ((i + 1) / n) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: 0,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <ConvBadge
                      conv={conv}
                      animated={animated}
                      delay={i * 60 + 280}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 justify-center flex-wrap">
        {[
          { color: '#16a34a', label: 'acima da meta' },
          { color: '#d97706', label: 'próximo da meta' },
          { color: '#dc2626', label: 'abaixo da meta' },
          { color: '#6b7280', label: 'taxa inconsistente' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#6b7280' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Insights panel ────────────────────────────────────────────────────────
// Derives insights purely from existing conversoes data — no new queries.
function InsightsPanel({
  conversoes, loading,
}: {
  conversoes: { real: number; meta: number; label: string }[];
  loading: boolean;
}) {
  const NAMES = [
    "Leads → MQL",
    "MQL → Agendamento",
    "Agendamento → Reunião",
    "Reunião → Proposta",
    "Proposta → Venda",
  ];

  const items = conversoes.map((c, i) => ({
    name: NAMES[i],
    real: c.real,
    meta: c.meta,
    label: c.label,
    gap: c.real <= 100 ? c.meta - c.real : null,
  }));

  const valid = items.filter(i => i.gap !== null && i.real <= 100);
  const belowMeta = valid.filter(i => i.real < i.meta);

  // Gargalo: biggest absolute gap below meta
  const gargalo = [...belowMeta].sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0];
  // Ponto crítico: lowest ratio real/meta (most critical proportionally)
  const critico = [...valid].sort((a, b) => (a.real / a.meta) - (b.real / b.meta))[0];
  // Oportunidade: closest to meta from below (smallest positive gap)
  const oportunidade = [...belowMeta].sort((a, b) => (a.gap ?? 99) - (b.gap ?? 99))[0];

  const insights: {
    tipo: string; cor: string; bgCor: string; icon: React.ElementType;
    titulo: string; descricao: string;
  }[] = [];

  if (!loading && gargalo) {
    insights.push({
      tipo: "Gargalo principal",
      cor: "#f87171",
      bgCor: "#dc262612",
      icon: AlertTriangle,
      titulo: gargalo.name,
      descricao: `Conversão de ${gargalo.real.toFixed(1)}% (${Math.abs(gargalo.gap ?? 0).toFixed(1)} p.p. abaixo da meta de ${gargalo.meta}%).`,
    });
  }
  if (!loading && critico && critico !== gargalo) {
    insights.push({
      tipo: "Ponto crítico",
      cor: "#fb923c",
      bgCor: "#ea580c12",
      icon: TrendingDown,
      titulo: critico.name,
      descricao: `Taxa de ${critico.real.toFixed(1)}% representa ${((critico.real / critico.meta) * 100).toFixed(0)}% da meta de ${critico.meta}%.`,
    });
  }
  if (!loading && oportunidade && oportunidade !== gargalo) {
    insights.push({
      tipo: "Oportunidade",
      cor: "#fbbf24",
      bgCor: "#d9770612",
      icon: Lightbulb,
      titulo: oportunidade.name,
      descricao: `${oportunidade.real.toFixed(1)}% dos leads avançam. Estamos a ${(oportunidade.gap ?? 0).toFixed(1)} p.p. da meta de ${oportunidade.meta}%.`,
    });
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Principais Insights
        </span>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 p-4 animate-pulse"
            style={{ background: 'hsl(var(--card)/0.4)', height: 100 }}
          />
        ))
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-border/30 p-4 text-center" style={{ background: 'hsl(var(--card)/0.3)' }}>
          <p className="text-xs text-muted-foreground">Sem dados suficientes para gerar insights.</p>
        </div>
      ) : (
        insights.map((ins) => {
          const Icon = ins.icon;
          return (
            <div
              key={ins.tipo}
              className="rounded-xl border p-4 flex flex-col gap-1.5"
              style={{
                background: ins.bgCor,
                borderColor: `${ins.cor}40`,
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${ins.cor}20` }}
                >
                  <Icon style={{ width: 14, height: 14, color: ins.cor }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ins.cor }}>
                  {ins.tipo}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">{ins.titulo}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{ins.descricao}</p>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── KPI progress card ─────────────────────────────────────────────────────
function KpiCard({
  label, val, icon: Icon, metaText, ratePct, loading, animDelay,
}: {
  label: string; val: number; icon: React.ElementType;
  metaText: string; ratePct: number; loading: boolean; animDelay: number;
}) {
  const barColor = getBarColor(ratePct, 100);
  const displayPct = Math.min(Math.max(ratePct, 0), 100);

  return (
    <div
      className="glass-card !p-4 flex flex-col gap-2"
      style={{
        animation: `funilKpiIn 0.35s ease both`,
        animationDelay: `${animDelay}ms`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9.5px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(var(--primary)/0.5)' }} />
      </div>
      <p className="text-[28px] font-black leading-none text-foreground">
        {loading ? <span className="text-muted-foreground/30">—</span> : val}
      </p>
      <p className="text-[10px] text-muted-foreground/60">{metaText}</p>
      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
        <div
          style={{
            height: '100%',
            width: loading ? '0%' : `${displayPct}%`,
            background: barColor,
            borderRadius: 9999,
            transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
            animation: loading ? undefined : `barGrow 0.8s cubic-bezier(0.22,1,0.36,1) both ${animDelay + 120}ms`,
          }}
        />
      </div>
      <p className="text-[10px] font-semibold" style={{ color: loading ? '#6b7280' : barColor }}>
        {loading ? '—' : `${ratePct.toFixed(1)}%`}
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function FunilXPTO() {
  const [searchParams, setSearchParams] = useSearchParams();
  const aba: "funil" | "sdr" = searchParams.get("tab") === "sdr" ? "sdr" : "funil";

  function setAba(value: "funil" | "sdr") {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("tab", value);
      return next;
    }, { replace: true });
  }

  const [funisSel, setFunisSel] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<"hoje" | "semana" | "mes" | "personalizado">("mes");
  const [customStart, setCustomStart] = useState(getMesInicio());
  const [customEnd, setCustomEnd] = useState(getHoje());
  const [campanhasSel, setCampanhasSel] = useState<string>("");
  const [origensSel, setOrigensSel] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<FunilData>({
    leads: 0, leadsPagos: 0, mql: 0,
    reunioesAgendadas: 0, reunioesRealizadas: 0,
    propostas: 0, fechados: 0,
  });
  const [loading, setLoading] = useState(true);

  const { data: campanhas } = useConfiguracoes("Campanha");
  const { data: origens } = useConfiguracoes("Origem");
  const { data: custos = [] } = useCustosMarketing();
  const { funisVisiveis: FUNIS_XPTO } = useFunisVisiveis();

  const start = periodo === "hoje" ? getHoje()
    : periodo === "semana" ? getSemanaAtras()
    : periodo === "mes" ? getMesInicio()
    : customStart;
  const end = periodo === "personalizado" ? customEnd : getHoje();

  const todosSelecionados = funisSel.length === 0;
  const funisFiltrados = todosSelecionados ? FUNIS_XPTO : FUNIS_XPTO.filter(f => funisSel.includes(f));
  const pipelineIdsFiltrados = funisFiltrados.map(f => PIPELINE_IDS[f]);

  const periodoLabel = periodo === "hoje" ? "Hoje"
    : periodo === "semana" ? "Últimos 7 dias"
    : periodo === "mes" ? "Este mês"
    : `${customStart} → ${customEnd}`;

  const funilLabel = todosSelecionados ? "Todos os funis"
    : funisSel.length === 1 ? funisSel[0]
    : `${funisSel.length} funis`;

  const activeFilters = (campanhasSel ? 1 : 0) + (origensSel ? 1 : 0);

  const totalCustosAds = custos
    .filter((c: any) => {
      if (c.categoria !== "Ads") return false;
      if (c.data < start || c.data > end) return false;
      if (!todosSelecionados && !funisFiltrados.map(f => f.toUpperCase()).includes((c.produto || "").toUpperCase())) return false;
      return true;
    })
    .reduce((s: number, c: any) => s + Number(c.valor), 0);

  const cpl = data.leadsPagos > 0 ? totalCustosAds / data.leadsPagos : 0;
  const cac = data.fechados > 0 ? totalCustosAds / data.fechados : 0;
  const corPrincipal = todosSelecionados ? "#E8192C" : (FUNIL_CORES[funisSel[0]] ?? "#E8192C");

  function toggleFunil(funil: string) {
    setFunisSel(prev => prev.includes(funil) ? prev.filter(f => f !== funil) : [...prev, funil]);
  }

  // ── Data fetching (unchanged from 9088d0b) ──────────────────────────────
  async function fetchData() {
    setLoading(true);
    let leadsQuery = supabase.from("leads_diarios_por_funil").select("total_leads, total_leads_pagos").gte("data", start).lte("data", end);
    if (!todosSelecionados) leadsQuery = leadsQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: leadsRows } = await leadsQuery;
    const totalLeads = (leadsRows ?? []).reduce((s: number, r: any) => s + r.total_leads, 0);
    const totalLeadsPagos = (leadsRows ?? []).reduce((s: number, r: any) => s + (r.total_leads_pagos || 0), 0);

    let mqlQuery = supabase.from("leads_geografia").select("id").eq("deletado", false).in("rating", [3, 5]).gte("created_at", start).lte("created_at", end + "T23:59:59");
    if (!todosSelecionados) mqlQuery = mqlQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: mqlRows } = await mqlQuery;
    const totalMQL = (mqlRows ?? []).length;

    let reunQuery = supabase.from("reunioes_agendadas").select("compareceu").gte("data", start).lte("data", end);
    if (!todosSelecionados) reunQuery = reunQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: reunRows } = await reunQuery;
    const totalAgendadas = (reunRows ?? []).length;
    const totalRealizadas = (reunRows ?? []).filter((r: any) => r.compareceu === true).length;

    let propQuery = supabase.from("propostas_crm").select("deal_id").gte("data", start).lte("data", end);
    if (!todosSelecionados) propQuery = propQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: propRows } = await propQuery;
    const totalPropostas = (propRows ?? []).length;

    let vendaQuery = supabase.from("vendas").select("status, funil").gte("data_fechamento", start).lte("data_fechamento", end);
    if (!todosSelecionados) vendaQuery = vendaQuery.in("funil", funisFiltrados);
    if (campanhasSel) vendaQuery = vendaQuery.eq("campanha", campanhasSel);
    if (origensSel) vendaQuery = vendaQuery.eq("origem", origensSel);
    const { data: vendasRows } = await vendaQuery;
    const totalFechados = (vendasRows ?? []).filter((v: any) => v.status === "Fechado").length;

    setData({ leads: totalLeads, leadsPagos: totalLeadsPagos, mql: totalMQL, reunioesAgendadas: totalAgendadas, reunioesRealizadas: totalRealizadas, propostas: totalPropostas, fechados: totalFechados });
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [funisSel, periodo, customStart, customEnd, campanhasSel, origensSel]);

  // ── Derived state (formulas unchanged from 9088d0b) ─────────────────────
  const etapas = [
    { label: "Leads recebidos",     val: data.leads,               pctDeTopo: data.leads > 0 ? 100 : 0 },
    { label: "MQL qualificados",    val: data.mql,                 pctDeTopo: pct(data.mql, data.leads) },
    { label: "Reuniões agendadas",  val: data.reunioesAgendadas,   pctDeTopo: pct(data.reunioesAgendadas, data.leads) },
    { label: "Reuniões realizadas", val: data.reunioesRealizadas,  pctDeTopo: pct(data.reunioesRealizadas, data.leads) },
    { label: "Propostas enviadas",  val: data.propostas,           pctDeTopo: pct(data.propostas, data.leads) },
    { label: "Fechados",            val: data.fechados,            pctDeTopo: pct(data.fechados, data.leads) },
  ];

  const conversoes = [
    { real: pct(data.mql, data.leads),                              meta: METAS.leads_para_mql,        label: "qualificados" },
    { real: pct(data.reunioesAgendadas, data.mql),                  meta: METAS.mql_para_reuniao,      label: "agendaram" },
    { real: pct(data.reunioesRealizadas, data.reunioesAgendadas),   meta: METAS.reuniao_para_show,     label: "compareceram" },
    { real: pct(data.propostas, data.reunioesRealizadas),           meta: METAS.show_para_proposta,    label: "receberam proposta" },
    { real: pct(data.fechados, data.propostas),                     meta: METAS.proposta_para_fechado, label: "fecharam" },
  ];

  const aiPayload = {
    periodo: periodoLabel,
    funil: funilLabel,
    leads_recebidos: data.leads,
    mql: data.mql,
    pct_qualificacao: `${pct(data.mql, data.leads).toFixed(1)}% (meta: ${METAS.leads_para_mql}%)`,
    reunioes_agendadas: data.reunioesAgendadas,
    pct_agendamento: `${pct(data.reunioesAgendadas, data.mql).toFixed(1)}% (meta: ${METAS.mql_para_reuniao}%)`,
    reunioes_realizadas: data.reunioesRealizadas,
    pct_showup: `${pct(data.reunioesRealizadas, data.reunioesAgendadas).toFixed(1)}% (meta: ${METAS.reuniao_para_show}%)`,
    propostas: data.propostas,
    pct_proposta: `${pct(data.propostas, data.reunioesRealizadas).toFixed(1)}% (meta: ${METAS.show_para_proposta}%)`,
    fechados: data.fechados,
    pct_fechamento: `${pct(data.fechados, data.propostas).toFixed(1)}% (meta: ${METAS.proposta_para_fechado}%)`,
    taxa_global: `${pct(data.fechados, data.leads).toFixed(1)}%`,
    cpl: totalCustosAds > 0 ? `R$ ${cpl.toFixed(0)}` : "sem dados de custo",
    cac: totalCustosAds > 0 ? `R$ ${cac.toFixed(0)}` : "sem dados de custo",
  };

  void corPrincipal;

  // KPI cards — progress % relative to each stage's conversion meta
  const kpiDefs = [
    {
      label: "Leads Recebidos",    val: data.leads,               icon: Users,
      metaText: "Meta: 300/mês",
      ratePct: Math.min(pct(data.leads, 300), 100),
    },
    {
      label: "MQL Qualificados",   val: data.mql,                 icon: UserCheck,
      metaText: `Meta: ${METAS.leads_para_mql}% leads`,
      ratePct: Math.min(pct(data.mql, data.leads), 100),
    },
    {
      label: "Reuniões Agendadas", val: data.reunioesAgendadas,   icon: CalendarCheck,
      metaText: `Meta: ${METAS.mql_para_reuniao}% MQL`,
      ratePct: Math.min(pct(data.reunioesAgendadas, data.mql), 100),
    },
    {
      label: "Reuniões Realizadas",val: data.reunioesRealizadas,  icon: Users2,
      metaText: `Meta: ${METAS.reuniao_para_show}% agend.`,
      ratePct: Math.min(pct(data.reunioesRealizadas, data.reunioesAgendadas), 100),
    },
    {
      label: "Propostas Enviadas", val: data.propostas,           icon: FileText,
      metaText: `Meta: ${METAS.show_para_proposta}% reun.`,
      ratePct: Math.min(pct(data.propostas, data.reunioesRealizadas), 100),
    },
    {
      label: "Vendas Fechadas",    val: data.fechados,            icon: TrendingUp,
      metaText: `Meta: ${METAS.proposta_para_fechado}% prop.`,
      ratePct: Math.min(pct(data.fechados, data.propostas), 100),
    },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Funil Comercial</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe a evolução dos leads e identifique onde estão as maiores oportunidades.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Funil / SDR tab */}
          <div className="inline-flex bg-muted/30 border border-border rounded-full p-1">
            <button
              onClick={() => setAba("funil")}
              className={cn("text-xs font-semibold uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all", aba === "funil" ? "bg-primary text-white shadow-[0_0_14px_-2px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}
            >Funil</button>
            <button
              onClick={() => setAba("sdr")}
              className={cn("text-xs font-semibold uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all", aba === "sdr" ? "bg-primary text-white shadow-[0_0_14px_-2px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}
            >SDR</button>
          </div>
          {/* Funil selector chips */}
          <button
            onClick={() => setFunisSel([])}
            className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all", todosSelecionados ? "text-white bg-primary border-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}
          >Todos</button>
          {FUNIS_XPTO.map((f) => {
            const sel = funisSel.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFunil(f)}
                className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all", sel ? "text-white border-transparent" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}
                style={sel ? { background: FUNIL_CORES[f], borderColor: FUNIL_CORES[f] } : {}}
              >{f}</button>
            );
          })}
          {/* Filter drawer */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-primary/40 transition-all">
                <Filter className="h-3 w-3" />Filtros
                {activeFilters > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background border-border">
              <SheetHeader>
                <SheetTitle className="font-display uppercase tracking-widest text-sm">Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Período</label>
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground">
                    <option value="hoje">Hoje</option>
                    <option value="semana">Últimos 7 dias</option>
                    <option value="mes">Este mês</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  {periodo === "personalizado" && (
                    <div className="mt-2 space-y-2">
                      <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground" />
                      <input type="date" value={customEnd} min={customStart} max={getHoje()} onChange={(e) => setCustomEnd(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Campanha</label>
                  <select value={campanhasSel} onChange={(e) => setCampanhasSel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground">
                    <option value="">Todas</option>
                    {(campanhas ?? []).map((c: any) => <option key={c.id} value={c.valor}>{c.valor}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Origem</label>
                  <select value={origensSel} onChange={(e) => setOrigensSel(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground">
                    <option value="">Todas</option>
                    {(origens ?? []).map((o: any) => <option key={o.id} value={o.valor}>{o.valor}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setCampanhasSel(""); setOrigensSel(""); setPeriodo("mes"); }} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all">Limpar</button>
                  <button onClick={() => setFilterOpen(false)} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:opacity-90">Aplicar</button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {aba === "sdr" ? (
        <PerformanceSDR
          funil={todosSelecionados ? undefined : funisSel[0]}
          periodoStart={new Date(start + "T00:00:00")}
          periodoEnd={new Date(end + "T23:59:59")}
        />
      ) : (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpiDefs.map((k, i) => (
              <KpiCard
                key={k.label}
                label={k.label}
                val={k.val}
                icon={k.icon}
                metaText={k.metaText}
                ratePct={k.ratePct}
                loading={loading}
                animDelay={i * 50}
              />
            ))}
          </div>

          {/* ── CPL / CAC compact ── */}
          {totalCustosAds > 0 && (
            <div className="flex gap-3 flex-wrap">
              {[
                { label: "CPL", val: `R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, sub: `${data.leadsPagos} leads via Ads` },
                { label: "CAC", val: `R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, sub: "Custo por aquisição" },
              ].map((k) => (
                <div
                  key={k.label}
                  className="glass-card !px-4 !py-2.5 flex items-center gap-3"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</span>
                  <span className="text-base font-bold text-amber-400">{loading ? "—" : k.val}</span>
                  <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">{k.sub}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Main area: funil + insights ── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_288px] gap-4">
            {/* Funil card */}
            <GlassCard>
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Funil de Conversão — {funilLabel}
                </h3>
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">{periodoLabel}</span>
              </div>

              <FunilHorizontal
                etapas={etapas}
                conversoes={conversoes}
                loading={loading}
              />

              <div className="mt-6 pt-5 border-t border-border/30">
                <AIAnalysisButton section="Funil Comercial" dataPayload={aiPayload} />
              </div>
            </GlassCard>

            {/* Insights panel */}
            <div className="glass-card !p-5">
              <InsightsPanel conversoes={conversoes} loading={loading} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
