import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlassCard } from "@/components/GlassCard";
import { Users } from "lucide-react";

interface Props {
  start: string;
  end: string;
}

interface LeadRow {
  data: string;
  funil: string;
  total_leads: number;
}

const FUNIS_ORDEM = [
  "Segredos da Confecção",
  "UniForce",
  "Imersões Paraguai",
  "CS Club",
  "Imersão Europa",
  "Imersão China",
];

const FUNIL_CORES: Record<string, string> = {
  "Segredos da Confecção": "#E8192C",
  "UniForce": "#C9A017",
  "Imersões Paraguai": "#4A9EFF",
  "CS Club": "#7C3AED",
  "Imersão Europa": "#10B981",
  "Imersão China": "#F97316",
};

type Periodo = "hoje" | "semana" | "mes" | "personalizado";

const PERIODO_LABELS: Record<Periodo, string> = {
  hoje: "Hoje",
  semana: "Últimos 7 dias",
  mes: "Este mês",
  personalizado: "Personalizado",
};

function getHoje() { return new Date().toISOString().split("T")[0]; }
function getMesInicio() { return getHoje().substring(0, 7) + "-01"; }
function getSemanaAtras() {
  return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export function LeadsDiariosCard({ start, end }: Props) {
  const [dados, setDados] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [funilSelecionado, setFunilSelecionado] = useState<string>("todos");
  const [customStart, setCustomStart] = useState(getMesInicio());
  const [customEnd, setCustomEnd] = useState(getHoje());

  const periodoStart =
    periodo === "hoje" ? getHoje() :
    periodo === "semana" ? getSemanaAtras() :
    periodo === "mes" ? getMesInicio() :
    customStart;

  const periodoEnd = periodo === "personalizado" ? customEnd : getHoje();

  async function fetchDados() {
    setLoading(true);
    const { data } = await supabase
      .from("leads_diarios_por_funil")
      .select("data, funil, total_leads")
      .gte("data", periodoStart)
      .lte("data", periodoEnd);
    setDados(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDados();
  }, [periodo, customStart, customEnd]);

  // Agrega por funil
  const totalPorFunil: Record<string, number> = {};
  dados.forEach((row) => {
    if (!totalPorFunil[row.funil]) totalPorFunil[row.funil] = 0;
    totalPorFunil[row.funil] += row.total_leads;
  });

  const funisExibidos = funilSelecionado === "todos"
    ? FUNIS_ORDEM
    : FUNIS_ORDEM.filter((f) => f === funilSelecionado);

  const totalGeral = funisExibidos.reduce((s, f) => s + (totalPorFunil[f] ?? 0), 0);
  const maxFunil = Math.max(...FUNIS_ORDEM.map((f) => totalPorFunil[f] ?? 0), 1);

  const periodoLabel =
    periodo === "hoje" ? getHoje() :
    periodo === "semana" ? `${getSemanaAtras()} — ${getHoje()}` :
    periodo === "mes" ? `${getMesInicio()} — ${getHoje()}` :
    `${customStart} — ${customEnd}`;

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-primary" />
          Chegada de Leads por Funil
        </h3>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de período */}
          <div className="flex gap-1 flex-wrap">
            {(["hoje", "semana", "mes", "personalizado"] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-md border transition-colors ${
                  periodo === p
                    ? "bg-primary/20 border-primary text-white"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {PERIODO_LABELS[p]}
              </button>
            ))}
          </div>

          {/* Filtro de funil */}
          <select
            value={funilSelecionado}
            onChange={(e) => setFunilSelecionado(e.target.value)}
            className="text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-md border border-border bg-muted/30 text-muted-foreground"
          >
            <option value="todos">Todos os funis</option>
            {FUNIS_ORDEM.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Seletor de datas personalizado */}
      {periodo === "personalizado" && (
        <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-background/40 border border-border/40">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">De</span>
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-[12px] px-2 py-1 rounded-md border border-border bg-muted/30 text-foreground"
          />
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Até</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={getHoje()}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-[12px] px-2 py-1 rounded-md border border-border bg-muted/30 text-foreground"
          />
        </div>
      )}

      {/* Totalizador */}
      <div className="flex items-center gap-4 mb-5 p-3 rounded-lg bg-background/40 border border-border/40">
        <div className="text-4xl font-bold text-primary leading-none">
          {loading ? "—" : totalGeral}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Total de leads
          </span>
          <span className="text-xs text-muted-foreground/70">{periodoLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 rounded-full px-3 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Tempo real
        </div>
      </div>

      {/* Tabela de funis */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {funisExibidos.map((funil) => {
            const count = totalPorFunil[funil] ?? 0;
            const cor = FUNIL_CORES[funil] ?? "#666";
            const pct = totalGeral > 0 ? ((count / totalGeral) * 100).toFixed(1) : "0.0";
            const barWidth = maxFunil > 0 ? (count / maxFunil) * 100 : 0;

            return (
              <div
                key={funil}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/30 border border-border/30 hover:border-primary/20 transition-colors"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
                <div className="text-xs font-semibold uppercase tracking-wide text-foreground/80 flex-1 min-w-0">
                  {funil}
                </div>
                <div className="flex-[2] h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%`, background: cor }}
                  />
                </div>
                <div className="text-lg font-bold min-w-[32px] text-right leading-none" style={{ color: cor }}>
                  {count}
                </div>
                <div className="text-[10px] text-muted-foreground min-w-[40px] text-right">
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
