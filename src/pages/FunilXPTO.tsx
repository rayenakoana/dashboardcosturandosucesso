import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { GlassCard } from "@/components/GlassCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const FUNIS_XPTO = [
  "Segredos da Confecção",
  "UniForce",
  "Imersões Paraguai",
  "CS Club",
  "Imersão Europa",
  "Imersão China",
];

const PIPELINE_IDS: Record<string, string> = {
  "Segredos da Confecção": "699effbf7b4346001f83c691",
  "UniForce": "6a04bd740b69f50013dd4c1a",
  "Imersões Paraguai": "699f00342be5b20013e23f9c",
  "CS Club": "6848412da06be900147fd766",
  "Imersão Europa": "6a3ab5572a7c51002575739f",
  "Imersão China": "6a3ab56ba02ee90021dd1c3b",
};

const FUNIL_CORES: Record<string, string> = {
  "Segredos da Confecção": "#E8192C",
  "UniForce": "#C9A017",
  "Imersões Paraguai": "#4A9EFF",
  "CS Club": "#7C3AED",
  "Imersão Europa": "#10B981",
  "Imersão China": "#F97316",
};

const METAS = {
  leads_para_mql: 50,
  mql_para_reuniao: 75,
  reuniao_para_show: 70,
  show_para_proposta: 60,
  proposta_para_fechado: 60,
};

function getHoje() { return new Date().toISOString().split("T")[0]; }
function getMesInicio() { return getHoje().substring(0, 7) + "-01"; }
function getSemanaAtras() {
  return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

interface FunilData {
  leads: number;
  mql: number;
  reunioesAgendadas: number;
  reunioesRealizadas: number;
  propostas: number;
  fechados: number;
}

function ConvRate({ real, meta, label }: { real: number; meta: number; label: string }) {
  const above = real >= meta;
  const igual = Math.abs(real - meta) < 0.1;
  const color = igual ? "text-muted-foreground" : above ? "text-emerald-400" : "text-red-400";
  const Icon = igual ? Minus : above ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-2 py-1.5 pl-7">
      <div className="w-px h-5 bg-border/60 ml-3" />
      <Icon className={cn("h-3 w-3 flex-shrink-0", color)} />
      <span className={cn("text-sm font-bold", color)}>{real.toFixed(1)}%</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-emerald-500/80 ml-auto">Meta: {meta}%</span>
    </div>
  );
}

export default function FunilXPTO() {
  // "todos" = array vazio significa todos os funis selecionados
  const [funisSel, setFunisSel] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<"hoje" | "semana" | "mes" | "personalizado">("mes");
  const [customStart, setCustomStart] = useState(getMesInicio());
  const [customEnd, setCustomEnd] = useState(getHoje());
  const [campanhasSel, setCampanhasSel] = useState<string>("");
  const [origensSel, setOrigensSel] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [data, setData] = useState<FunilData>({ leads: 0, mql: 0, reunioesAgendadas: 0, reunioesRealizadas: 0, propostas: 0, fechados: 0 });
  const [loading, setLoading] = useState(true);

  const { data: campanhas } = useConfiguracoes("Campanha");
  const { data: origens } = useConfiguracoes("Origem");

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

  // cor principal: primeiro funil selecionado, ou vermelho se todos
  const corPrincipal = todosSelecionados ? "#E8192C" : (FUNIL_CORES[funisSel[0]] ?? "#E8192C");

  function toggleFunil(funil: string) {
    setFunisSel(prev =>
      prev.includes(funil) ? prev.filter(f => f !== funil) : [...prev, funil]
    );
  }

  async function fetchData() {
    setLoading(true);

    // Leads
    let leadsQuery = supabase
      .from("leads_diarios_por_funil")
      .select("total_leads")
      .gte("data", start)
      .lte("data", end);
    if (!todosSelecionados) leadsQuery = leadsQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: leadsRows } = await leadsQuery;
    const totalLeads = (leadsRows ?? []).reduce((s: number, r: any) => s + r.total_leads, 0);

    // MQL (rating 5)
    let mqlQuery = supabase
      .from("leads_geografia")
      .select("id")
      .eq("rating", 5)
      .gte("created_at", start)
      .lte("created_at", end + "T23:59:59");
    if (!todosSelecionados) mqlQuery = mqlQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: mqlRows } = await mqlQuery;
    const totalMQL = (mqlRows ?? []).length;

    // Reuniões
    let reunQuery = supabase
      .from("reunioes_agendadas")
      .select("compareceu")
      .gte("data", start)
      .lte("data", end);
    if (!todosSelecionados) reunQuery = reunQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: reunRows } = await reunQuery;
    const totalAgendadas = (reunRows ?? []).length;
    const totalRealizadas = (reunRows ?? []).filter((r: any) => r.compareceu === true).length;

    // Vendas
    let vendaQuery = supabase
      .from("vendas")
      .select("status, funil, email_cliente")
      .gte("data_entrada", start)
      .lte("data_entrada", end);
    if (!todosSelecionados) vendaQuery = vendaQuery.in("funil", funisFiltrados);
    if (campanhasSel) vendaQuery = vendaQuery.eq("campanha", campanhasSel);
    if (origensSel) vendaQuery = vendaQuery.eq("origem", origensSel);
    const { data: vendasRows } = await vendaQuery;
    const totalFechados = (vendasRows ?? []).filter((v: any) => v.status === "Fechado" && v.email_cliente).length;
    const totalPropostas = (vendasRows ?? []).filter((v: any) => ["Fechado", "Negociação", "Proposta"].includes(v.status)).length;

    setData({ leads: totalLeads, mql: totalMQL, reunioesAgendadas: totalAgendadas, reunioesRealizadas: totalRealizadas, propostas: totalPropostas, fechados: totalFechados });
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [funisSel, periodo, customStart, customEnd, campanhasSel, origensSel]);

  const pct = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0;
  const maxVal = Math.max(data.leads, 1);

  const etapas = [
    { label: "Leads recebidos", val: data.leads, color: corPrincipal },
    { label: "MQL — qualificados", val: data.mql, color: "#7C3AED" },
    { label: "Reuniões agendadas", val: data.reunioesAgendadas, color: "#4A9EFF" },
    { label: "Reuniões realizadas", val: data.reunioesRealizadas, color: "#10B981" },
    { label: "Propostas", val: data.propostas, color: "#C9A017" },
    { label: "Fechados", val: data.fechados, color: "#555" },
  ];

  const conversoes = [
    { real: pct(data.mql, data.leads), meta: METAS.leads_para_mql, label: "qualificados" },
    { real: pct(data.reunioesAgendadas, data.mql), meta: METAS.mql_para_reuniao, label: "agendaram reunião" },
    { real: pct(data.reunioesRealizadas, data.reunioesAgendadas), meta: METAS.reuniao_para_show, label: "compareceram" },
    { real: pct(data.propostas, data.reunioesRealizadas), meta: METAS.show_para_proposta, label: "receberam proposta" },
    { real: pct(data.fechados, data.propostas), meta: METAS.proposta_para_fechado, label: "fecharam" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl uppercase tracking-wide">Funil XPTO</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">{periodoLabel} · {funilLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chip "Todos" */}
          <button
            onClick={() => setFunisSel([])}
            className={cn(
              "text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all",
              todosSelecionados
                ? "text-white bg-primary border-primary"
                : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            Todos
          </button>

          {/* Chips individuais */}
          {FUNIS_XPTO.map((f) => {
            const selecionado = funisSel.includes(f);
            return (
              <button
                key={f}
                onClick={() => toggleFunil(f)}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all",
                  selecionado ? "text-white border-transparent" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                )}
                style={selecionado ? { background: FUNIL_CORES[f], borderColor: FUNIL_CORES[f] } : {}}
              >
                {f}
              </button>
            );
          })}

          {/* Botão filtros */}
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-primary/40 transition-all">
                <Filter className="h-3 w-3" />
                Filtros
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
                  <select value={periodo} onChange={(e) => setPeriodo(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground">
                    <option value="hoje">Hoje</option>
                    <option value="semana">Últimos 7 dias</option>
                    <option value="mes">Este mês</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  {periodo === "personalizado" && (
                    <div className="mt-2 space-y-2">
                      <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground" />
                      <input type="date" value={customEnd} min={customStart} max={getHoje()} onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Campanha</label>
                  <select value={campanhasSel} onChange={(e) => setCampanhasSel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground">
                    <option value="">Todas</option>
                    {(campanhas ?? []).map((c: any) => <option key={c.id} value={c.valor}>{c.valor}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Origem</label>
                  <select value={origensSel} onChange={(e) => setOrigensSel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground">
                    <option value="">Todas</option>
                    {(origens ?? []).map((o: any) => <option key={o.id} value={o.valor}>{o.valor}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setCampanhasSel(""); setOrigensSel(""); setPeriodo("mes"); }}
                    className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all">
                    Limpar
                  </button>
                  <button onClick={() => setFilterOpen(false)}
                    className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:opacity-90">
                    Aplicar
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de leads", val: loading ? "—" : String(data.leads), sub: "Meta: 300/mês", color: "text-primary" },
          { label: "Taxa de fechamento", val: loading ? "—" : `${pct(data.fechados, data.leads).toFixed(1)}%`, sub: "Meta: 10%", color: "text-foreground" },
          { label: "CPL", val: "R$ —", sub: "Cadastre custos", color: "text-amber-400" },
          { label: "CAC", val: "R$ —", sub: "Cadastre custos", color: "text-amber-400" },
        ].map((k) => (
          <GlassCard key={k.label}>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{k.label}</div>
            <div className={cn("text-2xl font-bold leading-none", k.color)}>{k.val}</div>
            <div className="text-[11px] text-emerald-500/80 mt-1.5 font-medium">{k.sub}</div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          Funil de conversão — {funilLabel}
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-11 rounded-lg bg-muted/20 animate-pulse" />)}
          </div>
        ) : (
          <div>
            {etapas.map((etapa, i) => {
              const width = maxVal > 0 ? Math.max((etapa.val / maxVal) * 100, etapa.val > 0 ? 8 : 2) : 2;
              return (
                <div key={etapa.label}>
                  <div className="flex items-center gap-3">
                    <div className="text-[11px] font-bold text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <div className="h-11 rounded-lg flex items-center px-4 transition-all duration-500"
                        style={{ width: `${width}%`, minWidth: "140px", background: etapa.color }}>
                        <span className="text-[13px] font-bold uppercase tracking-wide text-white truncate">{etapa.label}</span>
                        <span className="text-lg font-bold text-white ml-auto flex-shrink-0 pl-3">{etapa.val}</span>
                      </div>
                    </div>
                  </div>
                  {i < conversoes.length && (
                    <ConvRate real={conversoes[i].real} meta={conversoes[i].meta} label={conversoes[i].label} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
