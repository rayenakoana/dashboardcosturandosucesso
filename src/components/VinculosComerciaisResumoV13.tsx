import {
  Children as CsChildrenV71,
  isValidElement as csIsElementV71,
  type ReactNode as CsNodeV71
} from "react";

function CsDiagRatioV71({
  children
}: {
  children: CsNodeV71
}) {
  const extrair = (node: CsNodeV71): string =>
    CsChildrenV71.toArray(node).map(item => {
      if (typeof item === "string" ||
          typeof item === "number") {
        return String(item);
      }
      if (csIsElementV71<{children?: CsNodeV71}>(item)) {
        return extrair(item.props.children);
      }
      return "";
    }).join("");

  const texto = extrair(children);
  const encontrado = texto.match(
    /([\d.,]+)\s+de\s+([\d.,]+)/i
  );

  if (!encontrado) {
    return <span>{children}</span>;
  }

  const numero = (s: string) =>
    Number(s.replace(/\./g, "").replace(",", "."));

  const parte = numero(encontrado[1]);
  const total = numero(encontrado[2]);

  if (!Number.isFinite(parte) ||
      !Number.isFinite(total) ||
      total <= 0 || parte < 0 || parte > total) {
    return <span>{children}</span>;
  }

  const percentual = (parte / total * 100).toLocaleString(
    "pt-BR",
    {minimumFractionDigits: 1, maximumFractionDigits: 1}
  );

  return (
    <span className="cs-diag-v71-primary">
      <strong className="cs-diag-v71-percent">
        {percentual}%
      </strong>
      <small className="cs-diag-v71-ratio">
        {children}
      </small>
    </span>
  );
}

// cs-dash-analiticos-mobile-v3-0
import type {
  ResultadoVinculosComerciais,
} from "@/lib/vinculosComerciaisPorDeal";

type Props = {
  resultado: ResultadoVinculosComerciais;
  periodo: string;
  funis: string;
  carregando: boolean;
  erro: boolean;
  filtrosVendasAtivos: boolean;
  modoPeriodo?: "pagina" | "30" | "90";
  onModoPeriodoChange?: (modo: "pagina" | "30" | "90") => void;
};

/**
 * CS Dash V1.3
 *
 * Faixa de inteligencia baseada em deal_id.
 * Somente leitura.
 * Nao substitui indicadores oficiais do funil.
 */
export function VinculosComerciaisResumoV13({
  resultado,
  periodo,
  funis,
  carregando,
  erro,
  filtrosVendasAtivos,
  modoPeriodo = "pagina",
  onModoPeriodoChange,
}: Props) {
  return (
    <section
      aria-label="Inteligência por oportunidade"
      className="cs-diag-exec-v70 cs-diag-v30-card cs-diag-v30-vinculos flex min-w-0 flex-col rounded-xl border border-border/70 bg-card/80 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#F7304E]"
            />
            <h3 className="text-base font-semibold text-foreground">
              Inteligência por oportunidade
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Correspondência entre qualificação e propostas
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="rounded-md border border-border/70 px-2 py-1">
            {periodo}
          </span>
          <span className="rounded-md border border-border/70 px-2 py-1">
            {funis}
          </span>
        </div>
      </div>

      {/* cs-vinculos-historico-v32: periodo exclusivo deste diagnostico */}
      {onModoPeriodoChange && (
        <div className="cs-diag-v32-periods" role="group" aria-label="Período da inteligência por oportunidade">
          {([
            ["30", "Últimos 30 dias"],
            ["90", "Últimos 90 dias"],
            ["pagina", "Período da página"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={modoPeriodo === id}
              onClick={() => onModoPeriodoChange(id)}
              className="cs-diag-v32-period"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {carregando ? (
        <p
          className="mt-4 text-xs text-muted-foreground"
          role="status"
        >
          Consolidando oportunidades do período...
        </p>
      ) : erro ? (
        <p className="mt-4 text-xs text-muted-foreground" role="alert">
          Não foi possível concluir a correlação entre MQL e propostas.
          Os indicadores oficiais permanecem independentes.
        </p>
      ) : (
        <>
          {/* Fontes reais usadas na correlacao de oportunidades */}
          <div className="cs-diag-v32-sources" aria-label="Volumes consultados para correlacao">
            <span>MQLs únicos <strong>{resultado.totalMqlUnicos.toLocaleString("pt-BR")}</strong></span>
            <span>Propostas únicas <strong>{resultado.totalPropostasUnicas.toLocaleString("pt-BR")}</strong></span>
          </div>
          {resultado.totalMqlUnicos === 0 && resultado.totalPropostasUnicas === 0 && (
            <p className="cs-diag-v32-empty" role="status">
              Não há MQLs nem propostas registrados neste recorte. Consulte outro período.
            </p>
          )}
          {/* cs-diag-interpretacao-v33: correspondencia, nao conversao */}
          {resultado.totalPropostasUnicas > 0 ? (
            <div
              className="cs-diag-v33-match"
              aria-label="Correspondência de propostas no recorte"
            >
              <div className="cs-diag-v33-match-heading">
                <span>Propostas com correspondência entre fontes</span>
                <CsDiagRatioV71><strong>
                  {resultado.oportunidadesEmAmbasFontes.toLocaleString("pt-BR")}
                  {" de "}
                  {resultado.totalPropostasUnicas.toLocaleString("pt-BR")}
                </strong></CsDiagRatioV71>
              </div>
              <div
                className="cs-diag-v33-track cs-diag-v73-match-track"
                role="progressbar"
                aria-label="Participação das propostas encontradas nas duas fontes neste recorte"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(
                  100 * resultado.oportunidadesEmAmbasFontes /
                  resultado.totalPropostasUnicas
                )}
              >
                <span className="cs-diag-v73-match-fill"
                  style={{ width: `${Math.min(100, Math.max(0,
                    100 * resultado.oportunidadesEmAmbasFontes /
                    resultado.totalPropostasUnicas
                  ))}%` }}
                />
              
    <span
      className="cs-diag-v73-match-remainder"
      aria-hidden="true"
    />
  </div>

<div className="cs-diag-v73-match-legend" aria-hidden="true">
  <span>
    <i className="cs-diag-v73-key-dot is-matched" />
    Pareadas entre fontes
  </span>
  <span>
    <i className="cs-diag-v73-key-dot is-unmatched" />
    Sem pareamento neste recorte
  </span>
</div>

              <p>
                {(100 * resultado.oportunidadesEmAmbasFontes /
                  resultado.totalPropostasUnicas).toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}% das propostas estão nas duas fontes neste recorte.
                Não é uma taxa de conversão por safra.
              </p>
            </div>
          ) : (
            <p className="cs-diag-v33-no-proposals">
              Sem propostas no período: correspondência não aplicável.
            </p>
          )}
          <div
            className="cs-diag-v30-metrics mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:mt-5 sm:grid-cols-3 sm:gap-4"
            aria-label="Indicadores de relacionamento comercial"
          >
            <div className="min-w-0 sm:border-r sm:border-border/60 sm:pr-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Presentes nas duas fontes
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                {resultado.oportunidadesEmAmbasFontes.toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="min-w-0 sm:border-r sm:border-border/60 sm:pr-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Propostas sem MQL no recorte
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                {resultado.propostasSemMqlNoRecorte.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Qualificação pode ter ocorrido antes
              </p>
            </div>

            <div className="cs-diag-v33-divergences col-span-2 min-w-0 border-t border-border/60 pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0"
              data-revisao={resultado.divergenciasFunil > 0 ? "true" : "false"}>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Divergências de funil
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                {resultado.divergenciasFunil.toLocaleString("pt-BR")}
              </p>
              {resultado.divergenciasFunil > 0 && (
                <p className="cs-diag-v33-divergence-note" role="note">
                  Verificar a identificação do funil entre as duas fontes.
                  A diferença não comprova erro de cadastro.
                </p>
              )}
            </div>
          </div>

          <div className="cs-intel-v26-method">
            <p className="cs-intel-v26-caveat">
              Eventos do período; não representam conversão por safra.
            </p>
            <details className="cs-intel-v26-details">
              <summary>Critérios de interpretação</summary>
              <p className="cs-intel-v26-full-note">
                Comparação de eventos registrados no período, não uma
                taxa de conversão por safra. Ausência de MQL no recorte
                não significa ausência de qualificação no histórico.
              </p>
            </details>
          </div>
        </>
      )}

      {filtrosVendasAtivos && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Produto, Campanha e Origem filtram vendas, mas não
          restringem esta correlação entre MQL e propostas.
        </p>
      )}
    </section>
  );
}
