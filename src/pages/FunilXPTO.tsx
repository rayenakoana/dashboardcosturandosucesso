import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { GlassCard } from "@/components/GlassCard";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter } from "lucide-react";
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

const FUNIL_ETAPA_CORES = [
  "#b91c1c",
  "#C8102E",
  "#e02040",
  "#e8384f",
  "#f05a6e",
  "#16a34a",
];

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

function getStatusColor(real: number, meta: number) {
  if (real > 100) return { bg: "#6b728020", border: "#6b7280", text: "#9ca3af" };
  if (real >= meta) return { bg: "#16a34a20", border: "#16a34a", text: "#4ade80" };
  if (real >= meta * 0.7) return { bg: "#d9770620", border: "#d97706", text: "#fbbf24" };
  return { bg: "#dc262620", border: "#dc2626", text: "#f87171" };
}

// Cor dinâmica por etapa
function getEtapaCor(index: number, data: FunilData): string {
  const vals = [data.leads, data.mql, data.reunioesAgendadas, data.reunioesRealizadas, data.propostas, data.fechados];
  if (index === 5) return data.fechados > 0 ? "#16a34a" : "#dc2626";
  if (vals[index] === 0) return "#dc2626";
  const cores = ["#b91c1c", "#C8102E", "#e02040", "#e8384f", "#f05a6e"];
  return cores[index] ?? "#C8102E";
}

// Hook para animar um número de 0 até o valor alvo
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
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, trigger, duration]);

  return display;
}

// Injeta os keyframes de animação uma vez
const STYLE_ID = "funil-anim-styles";
function injectFunilStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes funilBarIn {
      from { opacity: 0; transform: translateY(14px) scaleX(0.92); }
      to   { opacity: 1; transform: translateY(0)   scaleX(1); }
    }
    @keyframes funilBadgeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes funilHoverPulse {
      0%   { filter: brightness(1.25) drop-shadow(0 0 8px rgba(255,255,255,0.25)); }
      50%  { filter: brightness(1.38) drop-shadow(0 0 14px rgba(255,255,255,0.35)); }
      100% { filter: brightness(1.25) drop-shadow(0 0 8px rgba(255,255,255,0.25)); }
    }
  `;
  document.head.appendChild(style);
}

// Card individual de etapa
function FunilCard({etapa,conv,index,loading,animated,cor}:{etapa:{label:string;val:number;pctDeTopo:number};conv?:{real:number;meta:number;label:string};index:number;loading:boolean;animated:boolean;cor:string;}) {
  const displayVal = useCountUp(etapa.val, 650, animated);
  const sc = conv ? getStatusColor(conv.real, conv.meta) : null;
  return (
    <div>
      {index > 0 && conv && sc && (
        <div className="flex items-center gap-2 py-1" style={animated?{animation:"funilBadgeIn 0.28s ease both",animationDelay:`${index*60+20}ms`}:{opacity:0}}>
          <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.07)"}}/>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold shrink-0" style={{background:sc.bg,borderColor:sc.border,color:sc.text}}>
            <span>{conv.real > 100 ? '⚠ ' + conv.real.toFixed(0) + '%' : conv.real.toFixed(1) + '%'}</span>
            <span className="opacity-60">{conv.label}</span>
            <span className="opacity-40">·</span>
            <span className="opacity-50">meta {conv.meta}%</span>
          </div>
          <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.07)"}}/>
        </div>
      )}
      <div className="rounded-xl flex items-center gap-4 px-4 py-3 border" style={{borderLeft:`4px solid ${sc?sc.border:cor}`,borderTop:"1px solid rgba(255,255,255,0.06)",borderRight:"1px solid rgba(255,255,255,0.06)",borderBottom:"1px solid rgba(255,255,255,0.06)",background:loading?"rgba(255,255,255,0.03)":sc?`${sc.border}18`:`${cor}12`,...(animated?{animation:"funilBarIn 0.38s cubic-bezier(0.22,1,0.36,1) both",animationDelay:`${index*60}ms`}:{opacity:0})}}>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground truncate">{etapa.label}</p>
          <p className="text-2xl font-black leading-none mt-0.5" style={{color:loading?"rgba(255,255,255,0.15)":sc?sc.text:"rgba(255,255,255,0.9)"}}>{loading?"—":displayVal}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">do topo</p>
          <p className="text-base font-bold" style={{color:loading?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.55)"}}>{loading?"—":index===0?"100%":`${etapa.pctDeTopo.toFixed(0)}%`}</p>
        </div>
      </div>
    </div>
  );
}

function FunilCards({etapas,conversoes,loading,animated}:{etapas:{label:string;val:number;pctDeTopo:number}[];conversoes:{real:number;meta:number;label:string}[];loading:boolean;animated:boolean;}) {
  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-1">
      {etapas.map((etapa,i) => {
        const cor = loading?"#ffffff18":(FUNIL_ETAPA_CORES[i]??"#E8192C");
        return <FunilCard key={etapa.label} etapa={etapa} conv={conversoes[i-1]} index={i} loading={loading} animated={animated} cor={cor}/>;
      })}
    </div>
  );
}

function TrapezioFunil({
  etapas,
  conversoes,
  loading,
}: {
  etapas: { label: string; val: number; pctDeTopo: number }[];
  conversoes: { real: number; meta: number; label: string }[];
  loading: boolean;
  corBase: string;
}) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => { injectFunilStyles(); }, []);

  useEffect(() => {
    if (!loading) {
      setAnimated(false);
      const t = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(t);
    } else {
      setAnimated(false);
    }
  }, [loading, etapas.map(e => e.val).join(",")]);

  return (
    <FunilCards
      etapas={etapas}
      conversoes={conversoes}
      loading={loading}
      animated={animated}
    />
  );
}

export default function FunilXPTO() {
  const [aba, setAba] = useState<"funil" | "sdr">("funil");
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

    // Leads totais (ainda via leads_diarios_por_funil — não tem deal_id)
    let leadsQuery = supabase.from("leads_diarios_por_funil").select("total_leads, total_leads_pagos").gte("data", start).lte("data", end);
    if (!todosSelecionados) leadsQuery = leadsQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: leadsRows } = await leadsQuery;
    const totalLeads = (leadsRows ?? []).reduce((s: number, r: any) => s + r.total_leads, 0);
    const totalLeadsPagos = (leadsRows ?? []).reduce((s: number, r: any) => s + (r.total_leads_pagos || 0), 0);

    // MQL, propostas e fechados via funil_por_lead (ancorando pelo created_at do lead)
    let funilQuery = supabase.from("funil_por_lead").select("is_mql, tem_proposta, fechado").gte("data_entrada", start).lte("data_entrada", end).eq("deletado", false);
    if (!todosSelecionados) funilQuery = funilQuery.in("pipeline_id", pipelineIdsFiltrados);
    if (campanhasSel) funilQuery = funilQuery.eq("campanha", campanhasSel);
    if (origensSel) funilQuery = funilQuery.eq("origem", origensSel);
    const { data: funilRows } = await funilQuery;
    const totalMQL = (funilRows ?? []).filter((r: any) => r.is_mql === 1).length;
    const totalPropostas = (funilRows ?? []).filter((r: any) => r.tem_proposta === 1).length;
    const totalFechados = (funilRows ?? []).filter((r: any) => r.fechado === 1).length;

    // Reuniões — sem deal_id na tabela, mantém por data da reunião
    let reunQuery = supabase.from("reunioes_agendadas").select("compareceu").gte("data", start).lte("data", end);
    if (!todosSelecionados) reunQuery = reunQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: reunRows } = await reunQuery;
    const totalAgendadas = (reunRows ?? []).length;
    const totalRealizadas = (reunRows ?? []).filter((r: any) => r.compareceu === true).length;

    setData({ leads: totalLeads, leadsPagos: totalLeadsPagos, mql: totalMQL, reunioesAgendadas: totalAgendadas, reunioesRealizadas: totalRealizadas, propostas: totalPropostas, fechados: totalFechados });
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [funisSel, periodo, customStart, customEnd, campanhasSel, origensSel]);

  const etapas = [
    { label: "Leads recebidos", val: data.leads, pctDeTopo: 100 },
    { label: "MQL — qualificados", val: data.mql, pctDeTopo: pct(data.mql, data.leads) },
    { label: "Reuniões agendadas", val: data.reunioesAgendadas, pctDeTopo: pct(data.reunioesAgendadas, data.leads) },
    { label: "Reuniões realizadas", val: data.reunioesRealizadas, pctDeTopo: pct(data.reunioesRealizadas, data.leads) },
    { label: "Propostas enviadas", val: data.propostas, pctDeTopo: pct(data.propostas, data.leads) },
    { label: "Fechados", val: data.fechados, pctDeTopo: pct(data.fechados, data.leads) },
  ];

  const conversoes = [
    { real: pct(data.mql, data.leads), meta: METAS.leads_para_mql, label: "qualificados" },
    { real: pct(data.reunioesAgendadas, data.mql), meta: METAS.mql_para_reuniao, label: "agendaram" },
    { real: pct(data.reunioesRealizadas, data.reunioesAgendadas), meta: METAS.reuniao_para_show, label: "compareceram" },
    { real: pct(data.propostas, data.reunioesRealizadas), meta: METAS.show_para_proposta, label: "receberam proposta" },
    { real: pct(data.fechados, data.propostas), meta: METAS.proposta_para_fechado, label: "fecharam" },
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total de leads", val: loading ? "—" : String(data.leads), sub: "Meta: 300/mês", color: "text-primary" },
              { label: "Taxa de fechamento", val: loading ? "—" : `${pct(data.fechados, data.leads).toFixed(1)}%`, sub: "Meta: 10%", color: "text-foreground" },
              { label: "CPL", val: loading ? "—" : totalCustosAds === 0 ? "R$ —" : `R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, sub: loading ? "" : totalCustosAds === 0 ? "Cadastre custos" : `${data.leadsPagos} leads via Ads`, color: "text-amber-400" },
              { label: "CAC", val: loading ? "—" : totalCustosAds === 0 ? "R$ —" : `R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, sub: loading ? "" : totalCustosAds === 0 ? "Cadastre custos" : "Custo por Aquisição", color: "text-amber-400" },
            ].map((k) => (
              <GlassCard key={k.label}>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k.label}</div>
                <div className={cn("text-2xl font-bold leading-none", k.color)}>{k.val}</div>
                <div className="text-[11px] text-emerald-500/80 mt-1.5 font-medium">{k.sub}</div>
              </GlassCard>
            ))}
          </div>

          <GlassCard>
            {/* Header do card — só título, sem o botão IA aqui */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Funil de conversão — {funilLabel}
              </h3>
            </div>

            <TrapezioFunil
              etapas={etapas}
              conversoes={conversoes}
              loading={loading}
              corBase={corPrincipal}
              data={data}
            />

            {/* Legenda de status */}
            <div className="flex items-center gap-4 mt-6 justify-center flex-wrap">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />acima da meta
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />próximo da meta
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />abaixo da meta
              </div>
            </div>

            {/* Botão IA fora do flex header — expande corretamente */}
            <div className="mt-6 pt-5 border-t border-border/40">
              <AIAnalysisButton section="Funil XPTO" dataPayload={aiPayload} />
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
