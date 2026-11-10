/**
 * CS DASH — Vinculos comerciais por oportunidade
 *
 * Fase 1: correlacao somente em memoria.
 *
 * Nao grava no Supabase.
 * Nao modifica workflows.
 * Nao associa vendas por nome ou ID interno.
 *
 * Coincidencias entre eventos NAO representam
 * necessariamente conversoes da mesma safra.
 */

export type EventoComercialPorDeal = {
  deal_id: string | null;
  pipeline_id?: string | null;
};

export type VinculoComercial = {
  deal_id: string;
  mql: boolean;
  proposta: boolean;
  pipeline_id: string | null;
  divergenciaFunil: boolean;
};

export type ResultadoVinculosComerciais = {
  totalMqlUnicos: number;
  totalPropostasUnicas: number;
  oportunidadesEmAmbasFontes: number;
  mqlSemPropostaNoRecorte: number;
  propostasSemMqlNoRecorte: number;
  divergenciasFunil: number;
  vinculos: VinculoComercial[];
};

function normalizarId(valor: string | null | undefined) {
  return (valor ?? "").trim();
}

function normalizarPipeline(
  valor: string | null | undefined
) {
  return (valor ?? "").trim() || null;
}

export function relacionarEventosComerciais(
  mqls: EventoComercialPorDeal[],
  propostas: EventoComercialPorDeal[]
): ResultadoVinculosComerciais {
  const mapa = new Map<string, {
    mql: boolean;
    proposta: boolean;
    pipelinesMql: Set<string>;
    pipelinesProposta: Set<string>;
  }>();

  function registrar(
    eventos: EventoComercialPorDeal[],
    tipo: "mql" | "proposta"
  ) {
    for (const evento of eventos) {
      const id = normalizarId(evento.deal_id);
      if (!id) continue;

      let item = mapa.get(id);

      if (!item) {
        item = {
          mql: false,
          proposta: false,
          pipelinesMql: new Set<string>(),
          pipelinesProposta: new Set<string>(),
        };
        mapa.set(id, item);
      }

      item[tipo] = true;

      const pipeline = normalizarPipeline(
        evento.pipeline_id
      );

      if (pipeline) {
        if (tipo === "mql") {
          item.pipelinesMql.add(pipeline);
        } else {
          item.pipelinesProposta.add(pipeline);
        }
      }
    }
  }

  registrar(mqls, "mql");
  registrar(propostas, "proposta");

  const vinculos: VinculoComercial[] = [];

  for (const [deal_id, item] of mapa) {
    const pipelines = [
      ...item.pipelinesMql,
      ...item.pipelinesProposta,
    ];

    const divergenciaFunil =
      new Set(pipelines).size > 1;

    vinculos.push({
      deal_id,
      mql: item.mql,
      proposta: item.proposta,
      pipeline_id: divergenciaFunil
        ? null
        : pipelines[0] ?? null,
      divergenciaFunil,
    });
  }

  return {
    totalMqlUnicos:
      vinculos.filter(v => v.mql).length,

    totalPropostasUnicas:
      vinculos.filter(v => v.proposta).length,

    oportunidadesEmAmbasFontes:
      vinculos.filter(
        v => v.mql && v.proposta
      ).length,

    mqlSemPropostaNoRecorte:
      vinculos.filter(
        v => v.mql && !v.proposta
      ).length,

    propostasSemMqlNoRecorte:
      vinculos.filter(
        v => !v.mql && v.proposta
      ).length,

    divergenciasFunil:
      vinculos.filter(
        v => v.divergenciaFunil
      ).length,

    vinculos,
  };
}
