import { useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { useVendas } from "@/hooks/useVendas";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { FUNIL_CORES } from "@/lib/funis";
import { Target } from "lucide-react";

function isFechado(v: any) {
  return v.status === "Fechado";
}

export function MetaXVendidoFunil() {
  const { data: vendas = [], isLoading: loadingVendas } = useVendas();
  const { data: metasFunil = [], isLoading: loadingMetas } = useConfiguracoes();
  const { funisVisiveis } = useFunisVisiveis();

  const now = new Date();
  const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mesLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const linhas = useMemo(() => {
    return funisVisiveis
      .map(funil => {
        const metaItem = (metasFunil as any[]).find(
          m => m.tipo === "Meta Funil" && m.funil === funil && m.mes_ref === mesRef
        );
        const meta = metaItem ? Number(metaItem.valor) : 0;

        const vendasDoFunil = vendas.filter((v: any) => {
          if (v.funil !== funil || !isFechado(v)) return false;
          if (!v.data_fechamento) return false;
          return v.data_fechamento.startsWith(mesRef);
        });

        const totalVendido = vendasDoFunil.reduce((sum: number, v: any) => sum + (Number(v.valor) || 0), 0);
        const qtdVendas = vendasDoFunil.length;
        const pct = meta > 0 ? Math.min(100, (totalVendido / meta) * 100) : 0;

        return { funil, meta, totalVendido, qtdVendas, pct };
      })
      .filter(l => l.meta > 0 || l.totalVendido > 0);
  }, [vendas, metasFunil, funisVisiveis, mesRef]);

  const isLoading = loadingVendas || loadingMetas;

  return (
    <GlassCard>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-2">
        <Target className="h-3.5 w-3.5" /> Meta x Vendido por Funil
      </h3>
      <p className="text-xs text-muted-foreground mb-5 capitalize">{mesLabel}</p>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          Carregando...
        </div>
      ) : linhas.length === 0 ? (
        <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm text-center px-4">
          Nenhuma meta definida para este mês.
          <br />
          Configure em Administrativo → Metas.
        </div>
      ) : (
        <div className="space-y-5">
          {linhas.map(({ funil, meta, totalVendido, qtdVendas, pct }) => (
            <div key={funil}>
              <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: FUNIL_CORES[funil] || "#C8102E" }}
                  />
                  <span className="text-sm font-medium truncate">{funil}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {qtdVendas} {qtdVendas === 1 ? "venda" : "vendas"}
                  </span>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  R$ {totalVendido.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  {meta > 0 && ` / R$ ${meta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${meta > 0 ? pct : 0}%`,
                    background: FUNIL_CORES[funil] || "#C8102E",
                  }}
                />
              </div>
              {meta > 0 && (
                <div className="text-[11px] text-muted-foreground mt-1 text-right">
                  {pct.toFixed(0)}% da meta
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
