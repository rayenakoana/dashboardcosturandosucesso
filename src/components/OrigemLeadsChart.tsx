import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  start: string;
  end: string;
  pipelineIds: string[];
  todosSelecionados: boolean;
}

type OrigemItem = {
  nome: string;
  quantidade: number;
};

const CORES = [
  "#FF3158",
  "#FF9F40",
  "#38BDF8",
  "#10B981",
  "#7C83FF",
  "#A1A1AA",
];

export function OrigemLeadsChart({
  start, end, pipelineIds, todosSelecionados,
}: Props) {
  const [dados, setDados] = useState<OrigemItem[]>([]);
  const [origemAtiva, setOrigemAtiva] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setLoading(true);
      setErro("");

      try {
        const diaSeguinte = new Date(end + "T12:00:00Z");
        diaSeguinte.setUTCDate(diaSeguinte.getUTCDate() + 1);
        const fimExclusivo =
          diaSeguinte.toISOString().slice(0, 10) + "T00:00:00-03:00";

        const contagem = new Map<string, number>();
        let offset = 0;
        const limite = 1000;

        while (true) {
          let query = (supabase as any)
            .from("leads_origens")
            .select("deal_id,origem")
            .gte("lead_created_at", start + "T00:00:00-03:00")
            .lt("lead_created_at", fimExclusivo)
            .order("deal_id")
            .range(offset, offset + limite - 1);

          if (!todosSelecionados) {
            query = query.in("pipeline_id", pipelineIds);
          }

          const { data, error } = await query;
          if (error) throw error;

          const linhas = data ?? [];

          for (const linha of linhas) {
            const nome = (linha.origem || "Desconhecido").trim() || "Desconhecido";
            contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
          }

          if (linhas.length < limite) break;
          offset += limite;
        }

        const ordenados = [...contagem.entries()]
          .map(([nome, quantidade]) => ({ nome, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade);

        const principais = ordenados.slice(0, 5);
        const restantes = ordenados
          .slice(5)
          .reduce((soma, item) => soma + item.quantidade, 0);

        if (restantes > 0) {
          principais.push({ nome: "Demais origens", quantidade: restantes });
        }

        if (ativo) setDados(principais);
      } catch (error) {
        if (ativo) {
          setErro(error instanceof Error ? error.message : "Falha ao consultar origens");
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
  }, [start, end, pipelineIds.join(","), todosSelecionados]);

  const total = dados.reduce((soma, item) => soma + item.quantidade, 0);
  const semOrigem = dados.find(x => x.nome.trim().toLowerCase() === "desconhecido");

  return (
    <section className="glass-card cs-chart-executive cs-charts-acabamento-v1 cs-origem-dual-v1 !p-5 h-full min-w-0 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-foreground">
            Origem dos Leads
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1">
            Distribuição das origens sincronizadas no período.
          </p>
        </div>
        <PieIcon className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
      </div>

      {loading ? (
        <div className="flex-1 min-h-[250px] flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            Carregando origens...
          </span>
        </div>
      ) : erro ? (
        <div className="flex-1 min-h-[250px] flex items-center justify-center text-center">
          <span className="text-xs text-destructive">{erro}</span>
        </div>
      ) : total === 0 ? (
        <div className="flex-1 min-h-[250px] flex items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">
            Nenhuma origem sincronizada neste período
          </span>
        </div>
      ) : (
        <div className="flex-1 min-h-[250px] flex flex-col justify-start">
          <div className="cs-origem-ux-v2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center mb-3">
            <div className="h-[170px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dados}
                  dataKey="quantidade"
                  nameKey="nome"
                  onMouseEnter={(_, index) => setOrigemAtiva(index)}
                  onClick={(_, index) => setOrigemAtiva(index)}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={68}
                  stroke="rgba(10,15,26,0.95)"
                  strokeWidth={2}
                  paddingAngle={1.5}
                >
                  {dados.map((item, index) => (
                    <Cell key={item.nome} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <span className="text-[23px] font-bold tabular-nums text-foreground">
                {total}
              </span>
              <span className="text-[12px] text-muted-foreground uppercase tracking-wide">
                registros
              </span>
            </div>
          </div>

          
            <div className="cs-origem-ux-v3 min-w-0 border-t sm:border-t-0 sm:border-l border-white/[0.12] pt-3 sm:pt-2 sm:pl-3">
              <p className="cs-origem-titulo-v1 text-[12px] font-semibold text-muted-foreground">
                Origem não identificada
              </p>
              {semOrigem ? (
                <>
                  <p className="cs-origem-percentual-v1 text-[27px] font-bold text-red-400 tabular-nums mt-2">
                    {((semOrigem.quantidade / total) * 100).toFixed(1)}%
                  </p>
                  <p className="text-[12px] text-foreground/85 mt-1">
                    {semOrigem.quantidade} de {total} registros
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-muted-foreground mt-2">
                  Desconhecido não aparece entre as principais origens exibidas.
                </p>
              )}
            </div>
          </div>

          {/* cs-origem-detalhe-fixo: não cobre a rosca */}
          <div className={`cs-mobile-ux-v5 min-h-[48px] mb-3 flex items-center rounded-lg border border-white/[0.07] bg-black/[0.12] px-3 py-2 ${
              dados[origemAtiva ?? -1]?.nome?.trim().toLowerCase() === "desconhecido"
                ? "hidden"
                : ""
            }`}>
            {origemAtiva !== null && dados[origemAtiva] ? (
              <div className="flex w-full min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-foreground truncate">
                    {dados[origemAtiva].nome}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Origem selecionada
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-foreground tabular-nums">
                    {dados[origemAtiva].quantidade} negócios
                  </div>
                  <div className="text-[12px] text-muted-foreground tabular-nums">
                    {total > 0
                      ? ((dados[origemAtiva].quantidade / total) * 100).toFixed(1)
                      : "0,0"}% do total
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-[12px] text-muted-foreground">
                Passe o cursor ou toque na rosca para detalhar uma origem.
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[190px] flex flex-col justify-evenly mt-2">
            {dados.map((item, index) => {
              const pct = total > 0 ? (item.quantidade / total) * 100 : 0;

              return (
                <div
                  key={item.nome}
                  className="flex items-center gap-2.5 min-w-0"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: CORES[index % CORES.length] }}
                  />
                  <span
                    className="flex-1 min-w-0 truncate text-[12px] text-muted-foreground"
                    title={item.nome}
                  >
                    {item.nome}
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-foreground">
                    {Math.round(pct)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-3 mt-4 border-t border-border/30">
        <p className="text-[12px] text-muted-foreground/80">
          RD Station CRM · Histórico em sincronização
        </p>
      </div>
    </section>
  );
}
