import "@/styles/csPerformanceBalancedV59.css";
import {
  CalendarDays as KpiCalendarIcon,
  Users as KpiUsersIcon,
  AlertTriangle as KpiAlertIcon,
  BarChart3 as KpiBarIcon,
  ChevronRight as KpiChevronIcon,
} from "lucide-react";
import "@/styles/csPerformanceIndicatorsV57.css";
import { FunilSVGCore } from "@/components/FunilSVGCore";
/* cs-performance-prototype-v52 */
import "@/styles/csPerformancePrototypeV52.css";
import "@/styles/csPerformanceFunilV55.css";
import { Link } from "react-router-dom";
import { ArrowUpRight, GitBranch } from "lucide-react";

type Etapa = {
  nome: string;
  valor: number;
  cor: string;
};

type Props = {
  inicio: string;
  fim: string;
  funis: string;
  carregando: boolean;
  etapas: Etapa[];
  filtrosSomenteVendas?: string[];
  indicadores?: {
    agendamento: number;
    showUp: number;
    conversaoSafra: number;
    totalLeads: number;
  };
};

// cs-overview-funil-horizontal-v4-1
// Apresentacao exclusiva da Visao Geral.
// Recebe os mesmos dados do resumo V4, sem novas consultas.
export function ResumoFunilExecutivo({
  inicio,
  fim,
  funis,
  carregando,
  etapas,
  filtrosSomenteVendas = [],
  indicadores,
}: Props) {
  const base = etapas[0]?.valor ?? 0;
  const pct = (n: number) => Number.isFinite(n)
    ? `${n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : "—";
  const metricas = indicadores ? [
    { titulo: "Agendamento", valor: pct(indicadores.agendamento) },
    { titulo: "Show-up Rate", valor: pct(indicadores.showUp) },
    { titulo: "Conversão da Safra", valor: pct(indicadores.conversaoSafra) },
    { titulo: "Total de Leads", valor: indicadores.totalLeads.toLocaleString("pt-BR") },
  ] : [];

  return (
    <section
      className="cs-overview-v29-performance min-w-0 space-y-4 rounded-xl border
        border-border/75 bg-card/75 p-4 shadow-sm md:p-5"
      aria-label="Resumo executivo do funil comercial"
    >
      <div className="flex flex-wrap items-start
        justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#F7304E]" />
            <h2 className="cs-section-title font-display text-base
              font-bold text-foreground">
              Performance Comercial <span className="cs-performance-v52-inline cs-section-qualifier">(RESUMO DO FUNIL)</span>
            </h2>
          </div>
        </div>

        <Link
          to="/funil-xpto?tab=funil"
          className="inline-flex min-h-9 items-center
            gap-2 rounded-lg border border-[#F7304E]/40
            px-3 text-xs font-semibold text-[#F7304E]
            transition-colors hover:bg-[#F7304E]/10"
        >
          Ver Funil Comercial
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2
        text-[11px] text-muted-foreground">
        <span className="rounded-md border border-border/65
          bg-background/35 px-2.5 py-1.5">
          {String(inicio).split("-").reverse().join("/")} — {String(fim).split("-").reverse().join("/")}
        </span>

        <span className="max-w-full truncate rounded-md
          border border-border/65 bg-background/35
          px-2.5 py-1.5">
          {funis}
        </span>
      </div>


      {/* cs-overview-escopo-filtros-v4-4 */}
      {filtrosSomenteVendas.length > 0 && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/25
            bg-amber-500/[0.06] px-3 py-2.5
            text-xs leading-relaxed text-foreground/85"
        >
          <span className="font-semibold">
            Filtros específicos de vendas:
          </span>
          {" "}
          {filtrosSomenteVendas.join(", ")}.
          {" "}
          Esses critérios afetam Vendas fechadas,
          mas não restringem Leads, MQL, Reuniões
          ou Propostas neste resumo.
          O período e o funil selecionados continuam
          sendo aplicados às seis etapas.
        </div>
      )}

      <div className="cs-overview-v29-performance-grid">
      <div className="min-w-0 overflow-x-auto pb-1">
        
        {/* cs-performance-funil-xpto-v55 */}
        <div className="cs-performance-v55-svg">
          
          {/* cs-performance-proporcao-v64 */}
          <div className="cs-performance-v64-graphic">
<FunilSVGCore
            stages={etapas.map((etapa, i) => ({
              label: etapa.nome,
              shortLabel: [
                "Leads",
                "MQL",
                "Agendamentos",
                "Reuniões",
                "Propostas",
                "Vendas"
              ][i] ?? etapa.nome,
              val: etapa.valor,
              pctDeTopo: base > 0
                ? (etapa.valor / base) * 100
                : 0,
            }))}
            loading={carregando}
            showLabelStrip={false}
            fitToMax={true}
            compact={true}
          />
            <div
              className="cs-performance-v64-numbers"
              role="group"
              aria-label="Volumes das etapas comerciais"
            >
              {etapas.map((etapa, i) => (
                <span
                  key={etapa.nome}
                  className="cs-performance-v64-number"
                  style={{
                    left: `${((i + 0.5) / etapas.length) * 100}%`
                  }}
                  aria-label={`${etapa.nome}: ${etapa.valor.toLocaleString("pt-BR")}`}
                >
                  {carregando
                    ? "—"
                    : etapa.valor.toLocaleString("pt-BR")}
                </span>
              ))}
            </div>
          </div>


          {/* cs-performance-balanced-v59 */}
          <div className="cs-performance-v59-legend-scroll">
            <div
              className="cs-performance-v59-legend"
              role="list"
              aria-label="Seis etapas do funil comercial"
            >
              {etapas.map((etapa, i) => {
                const nomes = [
                  "Leads",
                  "MQL",
                  "Agendamentos",
                  "Reuniões",
                  "Propostas",
                  "Vendas",
                ];

                const naoComparavel =
                  i === 5 && filtrosSomenteVendas.length > 0;

                const percentual = naoComparavel
                  ? "N/C"
                  : carregando || base <= 0
                    ? "—"
                    : `${(i === 0
                        ? 100
                        : (etapa.valor / base) * 100
                      ).toFixed(1).replace(".", ",")}%`;

                return (
                  <div
                    role="listitem"
                    key={etapa.nome}
                    className="cs-performance-v59-stage"
                    title={etapa.nome}
                  >
                    <span
                      className="cs-performance-v59-color"
                      style={{ backgroundColor: etapa.cor }}
                    />
                    <span className="cs-performance-v59-name">
                      {nomes[i] ?? etapa.nome}
                    </span>
                    <strong>
                      {carregando
                        ? "—"
                        : etapa.valor.toLocaleString("pt-BR")}
                    </strong>
                    <small>{percentual}</small>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>


        {/* cs-performance-mobile-v46 */}
        <div
          className="cs-performance-mobile-v46-stages"
          role="list"
          aria-label="Etapas do funil comercial"
        >
          {etapas.map((etapa, i) => {
            const nomesMobile = [
              "Leads",
              "MQL",
              "Agendamentos",
              "Reuniões",
              "Propostas",
              "Vendas"
            ];

            const naoComparavel =
              i === 5 && filtrosSomenteVendas.length > 0;

            const pct = base > 0
              ? (i === 0 ? 100 : (etapa.valor / base) * 100)
              : 0;

            const percentual = naoComparavel
              ? "N/C"
              : carregando || base <= 0
                ? "—"
                : `${pct.toFixed(1).replace(".", ",")}%`;

            const largura =
              carregando || naoComparavel || base <= 0
                ? 0
                : Math.min(100, Math.max(0, pct));

            return (
              <div
                key={etapa.nome}
                role="listitem"
                className="cs-performance-mobile-v46-stage"
              >
                <div className="cs-performance-mobile-v46-top">
                  <span
                    className="cs-performance-mobile-v46-dot"
                    style={{ backgroundColor: etapa.cor }}
                    aria-hidden="true"
                  />

                  <span className="cs-performance-mobile-v46-name">
                    {nomesMobile[i] ?? etapa.nome}
                  </span>

                  <strong className="cs-performance-mobile-v46-value">
                    {carregando
                      ? "—"
                      : etapa.valor.toLocaleString("pt-BR")}
                  </strong>
                </div>

                <div className="cs-performance-mobile-v46-bottom">
                  <div className="cs-performance-mobile-v46-track">
                    <div
                      className="cs-performance-mobile-v46-fill"
                      style={{
                        width: `${largura}%`,
                        backgroundColor: etapa.cor
                      }}
                    />
                  </div>

                  <small className="cs-performance-mobile-v46-percent">
                    {percentual}
                  </small>
                </div>
              </div>
            );
          })}
        </div>

        {metricas.length > 0 && (
          <aside className="cs-overview-v29-indicators" aria-label="Principais indicadores comerciais">
            <h3>Principais indicadores</h3>
            {/* cs-performance-indicators-v57 */}
            <div className="cs-overview-v29-indicators-grid">
              {metricas.map((m, i) => {
                const Icone = [
                  KpiCalendarIcon,
                  KpiUsersIcon,
                  KpiAlertIcon,
                  KpiBarIcon,
                ][i];

                // Referencias visuais: Agendamento 50%,
                // Show-up 70%. Nao altera metas cadastradas.
                const referencia =
                  i === 0 ? 50 :
                  i === 1 ? 70 :
                  null;

                const numero = Number(
                  String(m.valor)
                    .replace("%", "")
                    .replace(/\./g, "")
                    .replace(",", ".")
                    .trim()
                );

                const estado =
                  referencia === null ||
                  carregando ||
                  !Number.isFinite(numero)
                    ? "neutral"
                    : numero >= referencia
                      ? "ok"
                      : "below";

                const complemento =
                  referencia !== null
                    ? `Referência: ${referencia}% · ${
                        estado === "ok"
                          ? "Dentro"
                          : estado === "below"
                            ? "Abaixo"
                            : "Sem avaliação"
                      }`
                    : i === 2
                      ? "Indicador por safra"
                      : carregando
                        ? "MQL: —"
                        : `MQL: ${(etapas[1]?.valor ?? 0)
                            .toLocaleString("pt-BR")}`;

                return (
                  <Link
                    key={m.titulo}
                    to="/funil-xpto?tab=funil"
                    className={`cs-overview-v29-indicator cs-performance-v57-kpi cs-performance-v57-kpi-${i + 1} cs-performance-v59-${estado}`}
                    aria-label={`Ver ${m.titulo} no Funil Comercial`}
                  >
                    <div className="cs-performance-v57-label">
                      <Icone
                        className="cs-performance-v57-icon"
                        aria-hidden="true"
                      />
                      <span>{m.titulo}</span>
                    </div>

                    <strong className="cs-performance-v57-value">
                      {m.valor}
                    </strong>

                    <span className="cs-performance-v57-detail">
                      {complemento}
                    </span>

                    <KpiChevronIcon
                      className="cs-performance-v57-arrow"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center
        justify-between gap-2 border-t border-border/60 pt-3">
        <p className="max-w-4xl text-[11px] leading-relaxed
          text-muted-foreground">
          Participação sobre os leads recebidos no período.
          As etapas têm fontes e datas de referência próprias;
          não representam uma conversão por safra.
        </p>

        <span className="text-[11px] font-medium
          text-muted-foreground">
          Análise completa no Funil Comercial
        </span>
      </div>
    </section>
  );
}
