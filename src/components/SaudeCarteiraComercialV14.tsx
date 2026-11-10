// cs-dash-analiticos-mobile-v3-0
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSDRs } from "@/hooks/useSDRs";

type Props = {
  funis: string[];
};

type NegocioCarteira = {
  deal_id: string;
  status: string;
  ultima_atividade_em: string | null;
};

const DIAS_ESFRIANDO = 3;

// Mesma correspondencia existente no acompanhamento SDR.
const NOMES_RD: Record<string, string[]> = {
  Supplytex: ["SUPPLYTEX"],
  SupplyTex: ["SUPPLYTEX"],
  "CS Club": ["C$ CLUB"],
  "Segredos da Confecção": ["SEGREDOS DA CONFECÇÃO"],
  UniForce: ["UNIFORCE"],
  "Imersão Paraguai": ["IMERSÃO PARAGUAI"],
  "Imersão Europa": ["IMERSÃO EUROPA"],
  "Imersão China": ["IMERSÃO CHINA"],
  "Funil Diagnóstico": [
    "FUNIL DIAGNOSTICO",
    "FUNIL DIAGNÓSTICO",
  ],
};

export function SaudeCarteiraComercialV14({ funis }: Props) {
  const {
    data: sdrs = [],
    isLoading: carregandoSDRs,
    isError: erroSDRs,
  } = useSDRs(true);

  const idsAtivos = useMemo(
    () => [...new Set(
      sdrs.map(s => s.rd_user_id).filter(Boolean)
    )].sort(),
    [sdrs]
  );

  const chaveFunis = [...funis].sort().join("|");

  const nomesRD = [
    ...new Set(funis.flatMap(f => NOMES_RD[f] ?? [f])),
  ];

  const {
    data: negocios = [],
    isLoading: carregandoNegocios,
    isError: erroNegocios,
  } = useQuery({
    queryKey: [
      "cs-dash-saude-carteira-v1-4",
      chaveFunis,
      idsAtivos.join("|"),
    ],
    enabled: idsAtivos.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<NegocioCarteira[]> => {
      const registros: NegocioCarteira[] = [];
      const pagina = 1000;

      for (let inicio = 0; ; inicio += pagina) {
        let consulta = supabase
          .from("deals_sdr_tracking")
          .select("deal_id,status,ultima_atividade_em")
          .in("rd_user_id", idsAtivos)
          .order("deal_id")
          .range(inicio, inicio + pagina - 1);

        if (nomesRD.length > 0) {
          consulta = consulta.in("funil", nomesRD);
        }

        const { data, error } = await consulta;
        if (error) throw error;

        const lote = data ?? [];
        registros.push(...lote);

        if (lote.length < pagina) break;
      }

      return registros;
    },
  });

  const resumo = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - DIAS_ESFRIANDO);

    const abertos = negocios.filter(
      d => d.status !== "Fechado" && d.status !== "Perdido"
    );

    return {
      emAndamento: negocios.filter(
        d => d.status === "Em andamento"
      ).length,

      esfriando: abertos.filter(
        d =>
          Boolean(d.ultima_atividade_em) &&
          new Date(d.ultima_atividade_em!).getTime() <
            limite.getTime()
      ).length,

      semAtividadeRegistrada: abertos.filter(
        d => !d.ultima_atividade_em
      ).length,

      totalAbertos: abertos.length,
    };
  }, [negocios]);

  // cs-dash-qualidade-carteira-v1-5
  // Cobertura do campo de atividade na carteira aberta.
  // Nao equivale a qualidade do atendimento comercial.
  const negociosComData = Math.max(
    0,
    resumo.totalAbertos - resumo.semAtividadeRegistrada
  );

  const percentualCobertura = resumo.totalAbertos > 0
    ? (negociosComData / resumo.totalAbertos) * 100
    : 0;

  const carregando =
    carregandoSDRs ||
    (idsAtivos.length > 0 && carregandoNegocios);

  const erro = erroSDRs || erroNegocios;

  return (
    <section
      aria-label="Saúde da Carteira Comercial"
      className="cs-diag-exec-v70 cs-diag-v30-card cs-diag-v30-carteira min-w-0 rounded-xl border border-border/70 bg-card/80 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-[#F7304E]"
            />
            <h3 className="text-base font-semibold text-foreground">
              Saúde da Carteira Comercial
            </h3>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Situação das oportunidades acompanhadas pelos SDRs ativos
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          <span className="rounded-md border border-border/70 px-2 py-1">
            Carteira atual
          </span>
          <span className="rounded-md border border-border/70 px-2 py-1">
            {funis.length > 0
              ? funis.join(", ")
              : "Todos os funis"}
          </span>
        </div>
      </div>

      {carregando ? (
        <p className="mt-4 text-xs text-muted-foreground" role="status">
          Consultando a carteira comercial...
        </p>
      ) : erro ? (
        <p className="mt-4 text-xs text-muted-foreground" role="alert">
          Não foi possível consultar a carteira comercial.
        </p>
      ) : idsAtivos.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Nenhum SDR ativo com identificador do CRM disponível.
        </p>
      ) : (
        <>
          <div className="cs-diag-v30-metrics mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:mt-5 sm:grid-cols-3 sm:gap-4">
            <div className="min-w-0 sm:border-r sm:border-border/60 sm:pr-3">
              <p className="text-xs text-muted-foreground">
                Em andamento
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                {resumo.emAndamento.toLocaleString("pt-BR")}
              </p>
            </div>

            <div className="min-w-0 sm:border-r sm:border-border/60 sm:pr-3">
              <p className="text-xs text-muted-foreground">
                Possível esfriamento
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                {resumo.esfriando.toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Última data de atividade registrada há mais de 3 dias
              </p>
            </div>

            <div className="col-span-2 min-w-0 border-t border-border/60 pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0">
              <p className="text-xs text-muted-foreground">
                Sem data de atividade registrada
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground sm:mt-2 sm:text-3xl">
                {resumo.semAtividadeRegistrada.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* cs-dash-qualidade-carteira-v1-5 */}
          <div className="cs-diag-v30-quality mt-3 border-t border-border/60 pt-3 sm:mt-4 sm:pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="cs-v43-quality-label text-xs font-semibold text-foreground">
                  Qualidade dos dados da carteira
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Distribuição dos registros de atividade nos negócios abertos
                </p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {Math.max(0, 100 - percentualCobertura).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  })}%
                </p>
                <p className="text-[10px] text-muted-foreground">
                  sem data registrada
                </p>
              </div>
            </div>

            {/* cs-diag-interpretacao-v33: lacuna de informacao */}
            {resumo.totalAbertos > 0 && (
              <p className="cs-diag-v33-coverage-note" role="note">
                <strong>Leitura parcial da carteira:</strong>{" "}
                {resumo.semAtividadeRegistrada.toLocaleString("pt-BR")}
                {" de "}
                {resumo.totalAbertos.toLocaleString("pt-BR")}
                {" negócios abertos sem data registrada ("}
                {(100 * resumo.semAtividadeRegistrada / resumo.totalAbertos)
                  .toLocaleString("pt-BR", {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                {"%). A ausência da data não comprova falta de atendimento."}
              </p>
            )}

            
<div className="cs-diag-v73-quality-distribution">
  <div className="cs-diag-v73-quality-legend" aria-hidden="true">
    <span>
      <i className="cs-diag-v73-key-dot is-recorded" />
      Com data
      <strong>
        {percentualCobertura.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}%
      </strong>
    </span>
    <span>
      <i className="cs-diag-v73-key-dot is-missing" />
      Sem data
      <strong>
        {Math.max(0, 100 - percentualCobertura).toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })}%
      </strong>
    </span>
  </div>

  <div
    className="cs-diag-v73-quality-rail"
    role="progressbar"
    aria-label="Cobertura da data de última atividade"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(percentualCobertura)}
  >
    <span
      className="cs-diag-v73-quality-recorded"
      style={{
        width: `${Math.min(100, Math.max(0, percentualCobertura))}%`,
      }}
    />
    <span
      className="cs-diag-v73-quality-missing"
      aria-hidden="true"
    />
  </div>
</div>


            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className="text-xs text-muted-foreground">
                Com data:
                <span className="ml-1 font-semibold tabular-nums text-foreground">
                  {negociosComData.toLocaleString("pt-BR")}
                </span>
              </p>

              <p className="text-xs text-muted-foreground">
                Sem data:
                <span className="ml-1 font-semibold tabular-nums text-foreground">
                  {resumo.semAtividadeRegistrada.toLocaleString("pt-BR")}
                </span>
              </p>

              <p className="text-xs text-muted-foreground">
                Base:
                <span className="ml-1 font-semibold tabular-nums text-foreground">
                  {resumo.totalAbertos.toLocaleString("pt-BR")}
                </span>
                {" "}negócios abertos
              </p>
            </div>

            {/* cs-dash-carteira-acabamento-v1-5-1 */}
            <div className="cs-intel-v26-method">
              <p className="cs-intel-v26-caveat">
                Categorias podem se sobrepor. Dados de atividade em validação.
              </p>
              <details className="cs-intel-v26-details">
                <summary>Critérios de interpretação</summary>
                <p className="cs-intel-v26-full-note">
                  Leitura da carteira atual, independente do período
                  selecionado. As categorias podem se sobrepor. Datas
                  ausentes ou antigas não comprovam falta de atendimento;
                  a origem do campo de atividade ainda está em validação.
                </p>
              </details>
            </div>
          </div>

          
        </>
      )}
    </section>
  );
}
