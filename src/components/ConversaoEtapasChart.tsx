import { classificarConversao } from "@/lib/classificacaoConversao";
interface Conversao {
  label: string;
  real: number;
  meta: number;
}

interface Props {
  conversoes: Conversao[];
  loading?: boolean;
}

const nomes = [
  "Leads → MQL",
  "MQL → Agendamento",
  "Agendamento → Reunião",
  "Reunião → Proposta",
  "Proposta → Venda",
];

function getCor(real: number, meta: number) {
  const status = classificarConversao(real, meta);
  if (status === "good") return "#18C58F";
  if (status === "near") return "#F59E0B";
  if (status === "bad") return "#FF375F";
  return "#94A3B8";
}

export function ConversaoEtapasChart({ conversoes, loading }: Props) {
  const abaixoDaMeta = conversoes.filter(
    item =>
      Number.isFinite(item.real) &&
      Number.isFinite(item.meta) &&
      item.real < item.meta
  ).length;

  return (
    <section className="glass-card cs-chart-executive cs-charts-acabamento-v1 cs-conversao-ux-v2 !p-5 h-full min-w-0 flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-foreground">
            Conversão por etapa
          </h3>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Resultado do período em relação à meta de referência.
          </p>
        </div>

        {!loading && conversoes.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2">
            <span
              className={`h-2 w-2 rounded-full ${
                abaixoDaMeta > 0 ? "bg-rose-500" : "bg-emerald-400"
              }`}
            />
            <span className="text-[12px] font-semibold text-foreground/85 tabular-nums whitespace-nowrap">
              {abaixoDaMeta} de {conversoes.length} abaixo da meta
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 min-h-[230px] flex items-center justify-center text-[12px] text-muted-foreground">
          Carregando conversões...
        </div>
      ) : conversoes.length === 0 ? (
        <div className="flex-1 min-h-[230px] flex items-center justify-center text-[13px] text-muted-foreground">
          Sem dados de conversão para o período.
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {conversoes.map((item, i) => {
            const real = Number.isFinite(item.real) ? item.real : 0;
            const meta = Number.isFinite(item.meta) ? item.meta : 0;
            const desvio = real - meta;
            const cor = getCor(real, meta);
            const largura = Math.min(100, Math.max(0, real));
            const abaixo = desvio < 0;

            return (
              <div
                key={`${item.label}-${i}`}
                className="relative min-w-0 px-3 py-3 sm:px-4 transition-colors hover:bg-white/[0.025]"
              >
                <div
                  className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
                  style={{
                    backgroundColor: abaixo ? cor : "transparent",
                  }}
                />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-foreground leading-snug">
                      {nomes[i] ?? item.label}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-muted-foreground tabular-nums">
                        Meta {meta.toFixed(0)}%
                      </span>
                      {abaixo && (
                        <span className="text-[11px] font-medium text-foreground/60">
                          Abaixo do esperado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[20px] font-bold leading-none text-foreground tabular-nums">
                      {real.toFixed(1)}%
                    </p>
                    <p
                      className="mt-1.5 text-[12px] font-semibold tabular-nums"
                      style={{ color: cor }}
                    >
                      {desvio >= 0 ? "+" : ""}
                      {desvio.toFixed(1)} p.p.
                    </p>
                  </div>
                </div>

                <div
                  className="relative mt-3 h-[7px] rounded-full bg-white/[0.08]"
                  role="img"
                  aria-label={`${nomes[i] ?? item.label}: realizado ${real.toFixed(1)}%, meta ${meta.toFixed(0)}%`}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${largura}%`,
                      backgroundColor: cor,
                    }}
                  />

                  {meta > 0 && meta <= 100 && (
                    <div
                      className="absolute z-10 top-[-4px] h-[15px] w-[2px] rounded-full bg-slate-100/90 shadow-sm"
                      style={{
                        left: `${meta}%`,
                        transform: "translateX(-50%)",
                      }}
                      title={`Meta: ${meta}%`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && conversoes.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="inline-block h-3 w-[2px] bg-slate-200/80" />
            Traço = meta
          </span>
          <span>
            Desvio em pontos percentuais
          </span>
        </div>
      )}
    </section>
  );
}
