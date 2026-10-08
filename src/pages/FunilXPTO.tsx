import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { GlassCard } from "@/components/GlassCard";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, Users, UserCheck, CalendarCheck, Users2, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_IDS, FUNIL_CORES } from "@/lib/funis";
import { PerformanceSDR } from "@/components/PerformanceSDR";

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

// real > 100 → cinza: aplica-se apenas a taxas de conversão entre etapas (a/b * 100).
// Uma taxa >100% indica anomalia de dados (ex: mais realizadas que agendadas) — cinza
// sinaliza dado inconsistente sem suprimir alertas de meta.
// Os cards KPI (atingimento de meta absoluto) não usam getStatusColor.
function getStatusColor(real: number, meta: number) {
  if (real > 100) return { bg: "#6b728020", border: "#6b7280", text: "#9ca3af" };
  if (real >= meta) return { bg: "#16a34a20", border: "#16a34a", text: "#4ade80" };
  if (real >= meta * 0.7) return { bg: "#d9770620", border: "#d97706", text: "#fbbf24" };
  return { bg: "#dc262620", border: "#dc2626", text: "#f87171" };
}

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

const STYLE_ID = "funil-anim-styles";
function injectFunilStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes funilBarIn {
      from { opacity: 0; transform: scaleX(0.93); }
      to   { opacity: 1; transform: scaleX(1); }
    }
    @keyframes funilBadgeIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// ── Trapezoid Funil ──────────────────────────────────────────────────────────

const STAGE_ICONS = [Users, UserCheck, CalendarCheck, Users2, FileText, TrendingUp];
const ARROW_PX = 26; // horizontal extent of the chevron notch/point

// One chevron stage — extracted as a component so useCountUp runs at the top level
function ChevronStage({
  etapa, index, total, animated, loading,
}: {
  etapa: { label: string; val: number; pctDeTopo: number };
  index: number; total: number; animated: boolean; loading: boolean;
}) {
  const displayVal = useCountUp(etapa.val, 650, animated);
  const Icon = STAGE_ICONS[index];
  const A = ARROW_PX;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const clipPath = isFirst
    ? `polygon(0 0, calc(100% - ${A}px) 0, 100% 50%, calc(100% - ${A}px) 100%, 0 100%)`
    : isLast
    ? `polygon(${A}px 0, 100% 0, 100% 100%, ${A}px 100%, 0 50%)`
    : `polygon(${A}px 0, calc(100% - ${A}px) 0, 100% 50%, calc(100% - ${A}px) 100%, ${A}px 100%, 0 50%)`;

  // Subtle shade variation per stage to keep visual separation
  const lightness = 18 - index * 1.5;
  const bg = `linear-gradient(160deg, hsl(351 65% ${lightness + 6}%) 0%, hsl(351 70% ${lightness}%) 100%)`;

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-white select-none"
      style={{
        clipPath,
        marginLeft: index > 0 ? -A : 0,
        zIndex: total - index,
        background: bg,
        paddingLeft: isFirst ? 14 : A + 6,
        paddingRight: isLast ? 14 : A + 6,
        minHeight: 148,
        ...(animated ? {
          animation: `funilBarIn 0.42s cubic-bezier(0.22,1,0.36,1) both`,
          animationDelay: `${index * 55}ms`,
        } : { opacity: 0 }),
      }}
    >
      <Icon className="w-5 h-5 mb-1.5 opacity-60 shrink-0" />
      <div className="text-[22px] font-black leading-none">
        {loading ? '—' : displayVal}
      </div>
      <div
        className="text-[8.5px] font-bold uppercase tracking-wider mt-1 text-center leading-snug px-1"
        style={{ opacity: 0.65 }}
      >
        {etapa.label}
      </div>
      <div className="text-[10px] font-semibold mt-1.5" style={{ opacity: 0.9 }}>
        {index === 0 ? '100%' : `${etapa.pctDeTopo.toFixed(0)}%`}
      </div>
    </div>
  );
}

function TrapezoidFunil({
  etapas,
  conversoes,
  loading,
}: {
  etapas: { label: string; val: number; pctDeTopo: number }[];
  conversoes: { real: number; meta: number; label: string }[];
  loading: boolean;
}) {
  const [animated, setAnimated] = useState(false);
  const n = etapas.length;

  useEffect(() => { injectFunilStyles(); }, []);

  useEffect(() => {
    if (!loading) {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(t);
    } else {
      setAnimated(false);
    }
  }, [loading]);

  return (
    <div>
      {/* ── Connected chevron funnel ── */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-stretch" style={{ minWidth: 520 }}>
          {etapas.map((etapa, i) => (
            <ChevronStage
              key={etapa.label}
              etapa={etapa}
              index={i}
              total={n}
              animated={animated}
              loading={loading}
            />
          ))}
        </div>
      </div>

      {/* ── Conversion badges — one per transition ── */}
      <div className="overflow-x-hidden -mx-1 px-1">
        <div className="relative mt-2.5" style={{ minWidth: 520, height: 58 }}>
          {conversoes.map((conv, i) => {
            const sc = loading ? null : getStatusColor(conv.real, conv.meta);
            // Badge is centered at the (i+1)/n fraction of the total width
            const leftPct = ((i + 1) / n) * 100;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2"
                style={{
                  left: `${leftPct}%`,
                  top: 0,
                  ...(animated ? {
                    animation: `funilBadgeIn 0.3s ease both`,
                    animationDelay: `${i * 55 + 200}ms`,
                  } : { opacity: 0 }),
                }}
              >
                {sc && (
                  <div
                    className="rounded-lg border text-center px-2.5 py-1.5"
                    style={{
                      background: sc.bg,
                      borderColor: sc.border,
                      minWidth: 88,
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    <div className="text-[11px] font-black leading-tight" style={{ color: sc.text }}>
                      {conv.real.toFixed(1)}%
                    </div>
                    <div className="text-[8.5px] leading-tight mt-px" style={{ color: sc.text, opacity: 0.75 }}>
                      {conv.label}
                    </div>
                    <div className="text-[8px] leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      meta {conv.meta}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status legend ── */}
      <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
        {[
          { color: 'bg-emerald-500', label: 'acima da meta' },
          { color: 'bg-amber-500', label: 'próximo da meta' },
          { color: 'bg-red-500', label: 'abaixo da meta' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className={cn("w-2.5 h-2.5 rounded-full", color)} />{label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

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

  const etapas = [
    { label: "Leads recebidos",    val: data.leads,              pctDeTopo: 100 },
    { label: "MQL qualificados",   val: data.mql,                pctDeTopo: pct(data.mql, data.leads) },
    { label: "Reuniões agendadas", val: data.reunioesAgendadas,  pctDeTopo: pct(data.reunioesAgendadas, data.leads) },
    { label: "Reuniões realizadas",val: data.reunioesRealizadas, pctDeTopo: pct(data.reunioesRealizadas, data.leads) },
    { label: "Propostas enviadas", val: data.propostas,          pctDeTopo: pct(data.propostas, data.leads) },
    { label: "Fechados",           val: data.fechados,           pctDeTopo: pct(data.fechados, data.leads) },
  ];

  const conversoes = [
    { real: pct(data.mql, data.leads),                          meta: METAS.leads_para_mql,      label: "qualificados" },
    { real: pct(data.reunioesAgendadas, data.mql),              meta: METAS.mql_para_reuniao,    label: "agendaram" },
    { real: pct(data.reunioesRealizadas, data.reunioesAgendadas), meta: METAS.reuniao_para_show, label: "compareceram" },
    { real: pct(data.propostas, data.reunioesRealizadas),       meta: METAS.show_para_proposta,  label: "receberam proposta" },
    { real: pct(data.fechados, data.propostas),                 meta: METAS.proposta_para_fechado, label: "fecharam" },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-wide">Funil XPTO</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{periodoLabel} · {funilLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex bg-muted/30 border border-border rounded-full p-1 mr-1">
            <button onClick={() => setAba("funil")} className={cn("text-xs font-semibold uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all", aba === "funil" ? "bg-primary text-white shadow-[0_0_14px_-2px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}>Funil</button>
            <button onClick={() => setAba("sdr")} className={cn("text-xs font-semibold uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all", aba === "sdr" ? "bg-primary text-white shadow-[0_0_14px_-2px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}>SDR</button>
          </div>
          <button onClick={() => setFunisSel([])} className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all", todosSelecionados ? "text-white bg-primary border-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}>Todos</button>
          {FUNIS_XPTO.map((f) => {
            const selecionado = funisSel.includes(f);
            return (
              <button key={f} onClick={() => toggleFunil(f)} className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all", selecionado ? "text-white border-transparent" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")} style={selecionado ? { background: FUNIL_CORES[f], borderColor: FUNIL_CORES[f] } : {}}>{f}</button>
            );
          })}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-primary/40 transition-all">
                <Filter className="h-3 w-3" />Filtros
                {activeFilters > 0 && <span className="bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background border-border">
              <SheetHeader><SheetTitle className="font-display uppercase tracking-widest text-sm">Filtros</SheetTitle></SheetHeader>
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
        <PerformanceSDR funil={todosSelecionados ? undefined : funisSel[0]} periodoStart={new Date(start + "T00:00:00")} periodoEnd={new Date(end + "T23:59:59")} />
      ) : (
        <>
          {/* 6-column KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Leads Recebidos",     val: data.leads,               icon: Users,         meta: "300/mês" },
              { label: "MQL Qualificados",    val: data.mql,                 icon: UserCheck,     meta: `meta ${METAS.leads_para_mql}% leads` },
              { label: "Reuniões Agendadas",  val: data.reunioesAgendadas,   icon: CalendarCheck, meta: `meta ${METAS.mql_para_reuniao}% MQL` },
              { label: "Reuniões Realizadas", val: data.reunioesRealizadas,  icon: Users2,        meta: `meta ${METAS.reuniao_para_show}% agend.` },
              { label: "Propostas Enviadas",  val: data.propostas,           icon: FileText,      meta: `meta ${METAS.show_para_proposta}% reun.` },
              { label: "Vendas Fechadas",     val: data.fechados,            icon: TrendingUp,    meta: `meta ${METAS.proposta_para_fechado}% prop.` },
            ].map((k) => (
              <div key={k.label} className="glass-card !p-3.5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{k.label}</span>
                  <k.icon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                </div>
                <p className="text-[22px] font-black leading-none text-foreground">
                  {loading ? '—' : k.val}
                </p>
                <p className="text-[10px] text-muted-foreground/60">{k.meta}</p>
              </div>
            ))}
          </div>

          {/* CPL / CAC row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "CPL", val: loading ? "—" : totalCustosAds === 0 ? "R$ —" : `R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, sub: loading ? "" : totalCustosAds === 0 ? "Cadastre custos" : `${data.leadsPagos} leads via Ads`, color: "text-amber-400" },
              { label: "CAC", val: loading ? "—" : totalCustosAds === 0 ? "R$ —" : `R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, sub: loading ? "" : totalCustosAds === 0 ? "Cadastre custos" : "Custo por Aquisição", color: "text-amber-400" },
            ].map((k) => (
              <div key={k.label} className="glass-card !p-3.5">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k.label}</div>
                <div className={cn("text-2xl font-bold leading-none", k.color)}>{k.val}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-1.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Trapezoid funnel card */}
          <GlassCard>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Funil de conversão — {funilLabel}
              </h3>
            </div>

            <TrapezoidFunil
              etapas={etapas}
              conversoes={conversoes}
              loading={loading}
            />

            <div className="mt-6 pt-5 border-t border-border/40">
              <AIAnalysisButton section="Funil XPTO" dataPayload={aiPayload} />
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
