import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

type Linha = {
  data: string;
  leads: number;
  mql: number;
  agendamentos: number;
  reunioes: number;
  propostas: number;
  vendas: number;
};

interface Props {
  start: string;
  end: string;
  pipelineIds: string[];
  funis: string[];
  todosSelecionados: boolean;
}

const series = [
  { key: "leads", label: "Leads", color: "#F7304E" },
  { key: "mql", label: "MQL", color: "#F59A23" },
  { key: "agendamentos", label: "Agendamentos", color: "#22C55E" },
  { key: "reunioes", label: "Reuniões", color: "#06B6D4" },
  { key: "propostas", label: "Propostas", color: "#1986E5" },
  { key: "vendas", label: "Vendas", color: "#9333B8" },
] as const;

export function EvolucaoFunilChart({
  start, end, pipelineIds, funis, todosSelecionados,
}: Props) {
  const [dados, setDados] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [foco, setFoco] = useState<(typeof series)[number]["key"] | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro("");

      try {
        let leadsQ = supabase.from("leads_diarios_por_funil")
          .select("data,total_leads")
          .gte("data", start).lte("data", end);

        let mqlQ = supabase.from("leads_geografia")
          .select("created_at")
          .eq("deletado", false)
          .in("rating", [3, 5])
          .gte("created_at", start)
          .lte("created_at", end + "T23:59:59");

        let reunQ = supabase.from("reunioes_agendadas")
          .select("data,compareceu")
          .gte("data", start).lte("data", end);

        let propQ = supabase.from("propostas_crm")
          .select("data")
          .gte("data", start).lte("data", end);

        let vendasQ = supabase.from("vendas")
          .select("data_fechamento")
          .eq("status", "Fechado")
          .gte("data_fechamento", start)
          .lte("data_fechamento", end);

        if (!todosSelecionados) {
          leadsQ = leadsQ.in("pipeline_id", pipelineIds);
          mqlQ = mqlQ.in("pipeline_id", pipelineIds);
          reunQ = reunQ.in("pipeline_id", pipelineIds);
          propQ = propQ.in("pipeline_id", pipelineIds);
          vendasQ = vendasQ.in("funil", funis);
        }

        const [leads, mql, reun, prop, vendas] = await Promise.all([
          leadsQ, mqlQ, reunQ, propQ, vendasQ,
        ]);

        const falha = [leads, mql, reun, prop, vendas]
          .find(resultado => resultado.error);

        if (falha?.error) throw falha.error;

        const mapa = new Map<string, Linha>();

        function adicionar(
          data: string, campo: keyof Omit<Linha, "data">,
          quantidade = 1,
        ) {
          const dia = data.slice(0, 10);
          const atual = mapa.get(dia) ?? {
            data: dia, leads: 0, mql: 0,
            agendamentos: 0, reunioes: 0,
            propostas: 0, vendas: 0,
          };

          atual[campo] += quantidade;
          mapa.set(dia, atual);
        }

        (leads.data ?? []).forEach(r =>
          adicionar(r.data, "leads", r.total_leads ?? 0)
        );

        (mql.data ?? []).forEach(r =>
          adicionar(r.created_at, "mql")
        );

        (reun.data ?? []).forEach(r => {
          adicionar(r.data, "agendamentos");
          if (r.compareceu) adicionar(r.data, "reunioes");
        });

        (prop.data ?? []).forEach(r =>
          adicionar(r.data, "propostas")
        );

        (vendas.data ?? []).forEach(r => {
          if (r.data_fechamento) {
            adicionar(r.data_fechamento, "vendas");
          }
        });

        const acumulado = {
          leads: 0, mql: 0, agendamentos: 0,
          reunioes: 0, propostas: 0, vendas: 0,
        };

        const historico: Linha[] = [];

        const cursor = new Date(start + "T12:00:00Z");
        const ultimo = new Date(end + "T12:00:00Z");

        while (cursor <= ultimo) {
          const dia = cursor.toISOString().slice(0, 10);
          const valores = mapa.get(dia);

          for (const serie of series) {
            acumulado[serie.key] += valores?.[serie.key] ?? 0;
          }

          historico.push({ data: dia, ...acumulado });
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }

        if (ativo) setDados(historico);
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof Error ? error.message : "Erro ao carregar dados"
          );
          setDados([]);
        }
      } finally {
        if (ativo) setLoading(false);
      }
    }

    if (start <= end && (todosSelecionados || pipelineIds.length > 0)) {
      carregar();
    } else {
      setDados([]);
      setLoading(false);
    }

    return () => { ativo = false; };
  }, [start, end, pipelineIds.join(","), funis.join(","), todosSelecionados]);

  const maximoFoco = foco
    ? dados.reduce((m, d) => Math.max(m, d[foco]), 1)
    : 0;

  return (
    <div className="glass-card cs-chart-executive cs-charts-acabamento-v1 cs-evolucao-ux-v2 cs-evolucao-ux-v3 cs-evolucao-ux-v4 !p-5 h-full min-w-0 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
        <h3 className="text-[14px] font-bold uppercase tracking-[0.06em]">
          Evolução do Funil
        </h3>
        <span className="text-[13px] font-semibold text-foreground/80 tabular-nums">
          {foco
              ? `Foco: ${series.find(item => item.key === foco)?.label} · ${(dados[dados.length - 1]?.[foco] ?? 0).toLocaleString("pt-BR")} acumulados`
              : "Acumulado no período"}
        </span>
      </div>


      <div className="cs-mobile-ux-v5 flex w-full min-w-0 flex-nowrap overflow-x-auto overscroll-x-contain gap-1 mb-4 pb-2" tabIndex={0} aria-label="Etapas do funil: deslize para navegar">
        {series.map(item => (
          <button
            key={item.key}
            type="button"
            aria-pressed={foco === item.key}
            onClick={() => setFoco(atual =>
              atual === item.key ? null : item.key
            )}
            className={`inline-flex shrink-0 whitespace-nowrap min-h-9 items-center gap-2
              rounded-md px-2.5 py-1.5 text-[12px]
              font-medium transition-colors
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-primary/60
              ${foco === item.key
                ? "bg-white/[0.09] text-foreground"
                : "text-muted-foreground hover:bg-white/[0.05]"}
              ${foco && foco !== item.key ? "opacity-55" : ""}`}
          >
            <span
              className="w-2 h-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </button>
        ))}
        {foco && (
          <button
            type="button"
            onClick={() => setFoco(null)}
            className="min-h-9 shrink-0 whitespace-nowrap px-2 text-[12px] font-semibold text-primary"
          >
            Mostrar todas
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground">
          Carregando evolução...
        </div>
      ) : erro ? (
        <div className="h-[230px] flex items-center justify-center text-xs text-red-400">
          {erro}
        </div>
      ) : dados.length === 0 ? (
        <div className="h-[230px] flex items-center justify-center text-xs text-muted-foreground">
          Sem dados no período
        </div>
      ) : (
        <div className="cs-evolucao-dual-v1 w-full flex-1 min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dados}
              margin={{ top: 12, right: 14, left: -12, bottom: 4 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.10)" vertical={false} strokeDasharray="3 4" />

              <XAxis
                dataKey="data"
                tickFormatter={v => v.slice(8, 10) + "/" + v.slice(5, 7)}
                stroke="#64748b"
                tick={{ fontSize: 12, fill: "#A6AFBD" }}
                minTickGap={30}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 12, fill: "#A6AFBD" }}
                allowDecimals={false}
                domain={foco ? [0, Math.ceil(maximoFoco * 1.12)] : [0, "auto"]}
              />

              <Tooltip
                labelFormatter={v => String(v).split("-").reverse().join("/")}
                contentStyle={{
                  background: "#111821",
                  border: "1px solid rgba(148,163,184,0.20)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />

              {series.filter(s => !foco || s.key === foco).map(s => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2.25}
                  dot={foco === s.key ? (props: any) => {
                      const { cx, cy, index } = props;
                      const atual = dados[index]?.[s.key] ?? 0;
                      const anterior = index > 0
                        ? dados[index - 1]?.[s.key] ?? 0
                        : 0;

                      if (
                        atual <= anterior ||
                        typeof cx !== "number" ||
                        typeof cy !== "number"
                      ) return <></>;

                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={3}
                          fill={s.color}
                          stroke="#111821"
                          strokeWidth={1.5}
                        />
                      );
                    } : false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
