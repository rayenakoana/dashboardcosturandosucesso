import { useMemo } from "react";
import { useLeadsGeografia } from "@/hooks/useLeadsGeografia";
import { useVendas } from "@/hooks/useVendas";
import {
  useConfiguracoes,
  useFunisVisiveis,
} from "@/hooks/useConfiguracoes";
import { obterRegiaoGeo } from "@/lib/geoRegiaoResumoV53";

const formatar = (valor: number) =>
  valor.toLocaleString("pt-BR");

const moeda = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const percentual = (valor: number) =>
  `${valor.toFixed(1).replace(".", ",")}%`;

function BarraResumo({ valor }: { valor: number }) {
  const participacao = Number.isFinite(valor)
    ? Math.max(0, Math.min(100, valor))
    : 0;

  return (
    <div
      className="cs-bars-v1-participation"
      role="meter"
      aria-label="Participação relativa"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={participacao}
      aria-valuetext={`${percentual(participacao)} de participação`}
    >
      <div
        className="cs-bars-v1-participation-fill"
        style={{ width: `${participacao}%` }}
      />
    </div>
  );
}

// cs-dash-executive-kpi-v2-4-1
// cs-overview-inteligencia-v5-3
// Base historica completa: mesmo hook do Geografico.
// O resumo usa somente registros cuja regiao brasileira
// pode ser classificada, sem inventar localizacoes.
export function ResumoGeoExecutivoV53() {
  const {
    data: rows = [],
    isLoading,
    isError,
  } = useLeadsGeografia();

  const resumo = useMemo(() => {
    const contagem: Record<string, number> = {};
    let totalBrasil = 0;

    for (const r of rows) {
      // cs-overview-consistencia-v5-4
      // Mesma condicao usada na matriz do Geografico V20.
      if (r.pais !== "Brasil") continue;

      // O denominador inclui todos os leads brasileiros,
      // inclusive os que nao possuem regiao identificada.
      totalBrasil += 1;

      const regiao = obterRegiaoGeo(
        r.uf,
        r.estado,
        r.regiao
      );

      if (regiao === "Não identificada") continue;

      contagem[regiao] = (contagem[regiao] || 0) + 1;
    }

    const ranking = Object.entries(contagem)
      .sort((a, b) => b[1] - a[1]);

    const primeira = ranking[0];

    return {
      nome: primeira?.[0] ?? "",
      quantidade: primeira?.[1] ?? 0,
      total: totalBrasil,
      participacao:
        primeira && totalBrasil > 0
          ? primeira[1] / totalBrasil * 100
          : 0,
    };
  }, [rows]);

  if (isLoading) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Consultando distribuição regional...
      </p>
    );
  }

  if (isError) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Dados regionais indisponíveis.
      </p>
    );
  }

  if (!resumo.total) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Nenhuma região brasileira identificada.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        Região com maior concentração
      </p>

      <p className="text-sm font-semibold text-foreground">
        {resumo.nome}
      </p>

      <p className="text-[26px] sm:text-[29px] 2xl:text-[32px] leading-tight font-bold tracking-tight tabular-nums text-foreground">
        {formatar(resumo.quantidade)}
        <span className="ml-2 text-[11px] font-normal
          text-muted-foreground">
          leads
        </span>
      </p>

      <p className="text-[11px] text-muted-foreground">
        {percentual(resumo.participacao)}
        {" dos "}
        {formatar(resumo.total)}
        {" leads brasileiros"}
      </p>

      <BarraResumo valor={resumo.participacao} />

    </div>
  );
}

// Espelha a referencia mensal e os funis visiveis
// do componente MetaXVendidoFunil, sem altera-lo.
export function ResumoMetaExecutivoV53() {
  const {
    data: vendas = [],
    isLoading: loadingVendas,
  } = useVendas();

  const {
    data: metas = [],
    isLoading: loadingMetas,
  } = useConfiguracoes();

  const {
    funisVisiveis,
    isLoading: loadingFunis,
  } = useFunisVisiveis();

  const mesRef = (() => {
    const agora = new Date();
    return (
      agora.getFullYear() +
      "-" +
      String(agora.getMonth() + 1).padStart(2, "0")
    );
  })();

  const resumo = useMemo(() => {
    let realizado = 0;
    let metaTotal = 0;
    let comMeta = 0;

    for (const funil of funisVisiveis) {
      const metaItem = (metas as any[]).find(
        m =>
          m.tipo === "Meta Funil" &&
          m.funil === funil &&
          m.mes_ref === mesRef
      );

      const meta = metaItem
        ? Number(metaItem.valor) || 0
        : 0;

      const vendasDoFunil = vendas.filter(
        (v: any) =>
          v.funil === funil &&
          v.status === "Fechado" &&
          v.data_fechamento &&
          v.data_fechamento.startsWith(mesRef)
      );

      realizado += vendasDoFunil.reduce(
        (s: number, v: any) =>
          s + (Number(v.valor) || 0),
        0
      );

      if (meta > 0) {
        metaTotal += meta;
        comMeta += 1;
      }
    }

    return {
      realizado,
      metaTotal,
      comMeta,
      participacao:
        metaTotal > 0
          ? realizado / metaTotal * 100
          : null,
    };
  }, [vendas, metas, funisVisiveis, mesRef]);

  if (loadingVendas || loadingMetas || loadingFunis) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Consultando metas do mês...
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        Faturamento realizado no mês
      </p>

      <p className="text-[26px] sm:text-[29px] 2xl:text-[32px] leading-tight font-bold tracking-tight tabular-nums text-foreground">
        {moeda(resumo.realizado)}
      </p>

      {resumo.participacao !== null ? (
        <>
          <p className="text-[11px] text-muted-foreground">
            {percentual(resumo.participacao)}
            {" da meta de "}
            {moeda(resumo.metaTotal)}
          </p>

          <BarraResumo valor={resumo.participacao} />

          <p className="text-[11px] text-muted-foreground">
            {resumo.realizado >= resumo.metaTotal
              ? "Meta de faturamento atingida"
              : `Faltam ${moeda(
                  resumo.metaTotal - resumo.realizado
                )} para a meta`}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Sem metas por funil configuradas para o mês.
        </p>
      )}

    </div>
  );
}
