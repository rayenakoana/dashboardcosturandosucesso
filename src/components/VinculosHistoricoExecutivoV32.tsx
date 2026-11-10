import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  relacionarEventosComerciais,
  type ResultadoVinculosComerciais,
} from "@/lib/vinculosComerciaisPorDeal";
import { VinculosComerciaisResumoV13 } from "@/components/VinculosComerciaisResumoV13";

// cs-vinculos-historico-v32 - consultas somente leitura, independentes do periodo global.
type Modo = "pagina" | "30" | "90";
type Evento = { deal_id: string | null; pipeline_id: string | null };

type Props = {
  // Cliente ja configurado na Visao Geral; nao abre outra conexao.
  supabase: { from: (tabela: string) => any };
  inicioPagina: string;
  fimPagina: string;
  pipelineIdsFiltrados: string[];
  todosFunisSelecionados: boolean;
  funis: string;
  resultadoPagina: ResultadoVinculosComerciais;
  carregandoPagina: boolean;
  erroPagina: boolean;
  filtrosVendasAtivos: boolean;
};

function isoLocal(data: Date): string {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function VinculosHistoricoExecutivoV32({
  supabase,
  inicioPagina,
  fimPagina,
  pipelineIdsFiltrados,
  todosFunisSelecionados,
  funis,
  resultadoPagina,
  carregandoPagina,
  erroPagina,
  filtrosVendasAtivos,
}: Props) {
  const [modo, setModo] = useState<Modo>("30");
  const janela = useMemo(() => {
    if (modo === "pagina") return { inicio: inicioPagina, fim: fimPagina };
    const agora = new Date();
    const fim = isoLocal(agora);
    const dias = modo === "90" ? 90 : 30;
    const inicio = isoLocal(new Date(
      agora.getFullYear(), agora.getMonth(), agora.getDate() - (dias - 1)
    ));
    return { inicio, fim };
  }, [modo, inicioPagina, fimPagina]);

  const ids = pipelineIdsFiltrados.join("|");
  const habilitado = modo !== "pagina";

  // As fontes mantem os mesmos predicados do diagnostico original.
  const mql = useQuery<Evento[]>({
    queryKey: ["cs_vinculos_v32", "mql", janela.inicio, janela.fim, ids, todosFunisSelecionados],
    enabled: habilitado,
    queryFn: async () => {
      if (!todosFunisSelecionados && pipelineIdsFiltrados.length === 0) return [];
      let q = supabase.from("leads_geografia")
        .select("deal_id, pipeline_id")
        .eq("deletado", false)
        .in("rating", [3, 5])
        .gte("created_at", janela.inicio)
        .lte("created_at", `${janela.fim}T23:59:59`);
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      const itens: Evento[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await q.range(offset, offset + 999);
        if (error) throw error;
        const lote: Evento[] = data ?? [];
        itens.push(...lote);
        if (lote.length < 1000) break;
      }
      return itens;
    },
  });

  const propostas = useQuery<Evento[]>({
    queryKey: ["cs_vinculos_v32", "propostas", janela.inicio, janela.fim, ids, todosFunisSelecionados],
    enabled: habilitado,
    queryFn: async () => {
      if (!todosFunisSelecionados && pipelineIdsFiltrados.length === 0) return [];
      let q = supabase.from("propostas_crm")
        .select("deal_id, pipeline_id")
        .gte("data", janela.inicio)
        .lte("data", janela.fim);
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      const itens: Evento[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await q.range(offset, offset + 999);
        if (error) throw error;
        const lote: Evento[] = data ?? [];
        itens.push(...lote);
        if (lote.length < 1000) break;
      }
      return itens;
    },
  });

  const resultadoHistorico = useMemo(
    () => relacionarEventosComerciais(mql.data ?? [], propostas.data ?? []),
    [mql.data, propostas.data]
  );
  const historicoCarregando = mql.isLoading || propostas.isLoading || mql.isFetching || propostas.isFetching;
  const historicoErro = mql.isError || propostas.isError;

  return (
    <VinculosComerciaisResumoV13
      resultado={habilitado ? resultadoHistorico : resultadoPagina}
      periodo={`${janela.inicio} a ${janela.fim}`}
      funis={funis}
      carregando={habilitado ? historicoCarregando : carregandoPagina}
      erro={habilitado ? historicoErro : erroPagina}
      filtrosVendasAtivos={filtrosVendasAtivos}
      modoPeriodo={modo}
      onModoPeriodoChange={setModo}
    />
  );
}
