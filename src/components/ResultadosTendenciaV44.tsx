import { useMemo } from "react";

// cs-results-trend-v47
// Dias com movimento real, sem valores inventados.

type Tipo = "vendas" | "ticket" | "renovacao";

type Venda = {
  data_fechamento?: string | null;
  valor?: number | string | null;
  is_renovacao?: boolean | null;
};

type Props = {
  tipo: Tipo;
  vendasAtuais: Venda[];
  vendasAnteriores: Venda[];
  excluirRenovacao: boolean;
  inicio: string;
  fim: string;
  anteriorInicio: string;
  anteriorFim: string;
};

function selecionar(
  vendas: Venda[],
  tipo: Tipo,
  excluirRenovacao: boolean
): Venda[] {
  if (tipo === "renovacao") {
    return vendas.filter(v => v.is_renovacao);
  }

  if (tipo === "ticket" && excluirRenovacao) {
    return vendas.filter(v => !v.is_renovacao);
  }

  return vendas;
}

function metrica(vendas: Venda[], tipo: Tipo): number {
  if (tipo === "vendas") return vendas.length;

  const receita = vendas.reduce(
    (s, v) => s + (Number(v.valor) || 0), 0
  );

  if (tipo === "ticket") {
    return vendas.length ? receita / vendas.length : 0;
  }

  return receita;
}


// cs-results-status-v65
export type EstadoResultadoV65 =
  "positivo" | "negativo" | "neutro";

export function classificarVariacaoV65(
  variacao: number | null
): EstadoResultadoV65 {
  if (variacao === null || !Number.isFinite(variacao))
    return "neutro";
  if (variacao > 0.05) return "positivo";
  if (variacao < -0.05) return "negativo";
  return "neutro";
}

function calcularVariacaoV65(
  atual: number,
  anterior: number
): number | null {
  return anterior > 0
    ? ((atual - anterior) / anterior) * 100
    : null;
}

export function obterEstadoResultadoV65(
  tipo: Tipo,
  vendasAtuais: Venda[],
  vendasAnteriores: Venda[],
  excluirRenovacao: boolean
): EstadoResultadoV65 {
  const atuais = selecionar(
    vendasAtuais, tipo, excluirRenovacao
  );
  const anteriores = selecionar(
    vendasAnteriores, tipo, excluirRenovacao
  );

  return classificarVariacaoV65(
    calcularVariacaoV65(
      metrica(atuais, tipo),
      metrica(anteriores, tipo)
    )
  );
}

type Dia = {
  data: string;
  quantidade: number;
  receita: number;
};

function serieComMovimento(
  vendas: Venda[],
  tipo: Tipo,
  inicio: string,
  fim: string
): number[] {
  const mapa = new Map<string, Dia>();

  for (const venda of vendas) {
    const data = String(venda.data_fechamento ?? "").slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;
    if (data < inicio || data > fim) continue;

    const atual = mapa.get(data) ?? {
      data,
      quantidade: 0,
      receita: 0,
    };

    atual.quantidade += 1;
    atual.receita += Number(venda.valor) || 0;

    mapa.set(data, atual);
  }

  const dias = [...mapa.values()]
    .sort((a, b) => a.data.localeCompare(b.data));

  return dias.map(dia => {
    if (tipo === "vendas") return dia.quantidade;

    if (tipo === "ticket") {
      return dia.quantidade
        ? dia.receita / dia.quantidade
        : 0;
    }

    return dia.receita;
  });
}

function desenharLinha(valores: number[]) {
  if (valores.length < 2) {
    return { linha: "", area: "" };
  }

  const maximo = Math.max(...valores, 1);

  const pontos = valores.map((valor, i) => ({
    x: 5 + i * 210 / (valores.length - 1),
    y: 57 - (valor / maximo) * 43,
  }));

  // Curva monotona entre cada par de pontos.
  // Nao acrescenta valores ou picos intermediarios.
  let linha = `M ${pontos[0].x} ${pontos[0].y}`;

  for (let i = 1; i < pontos.length; i++) {
    const anterior = pontos[i - 1];
    const atual = pontos[i];
    const dx = atual.x - anterior.x;

    linha +=
      ` C ${anterior.x + dx * 0.4} ${anterior.y}` +
      ` ${atual.x - dx * 0.4} ${atual.y}` +
      ` ${atual.x} ${atual.y}`;
  }

  const area = `${linha} L 215 64 L 5 64 Z`;

  return { linha, area };
}

export function ResultadosTendenciaV44({
  tipo,
  vendasAtuais,
  vendasAnteriores,
  excluirRenovacao,
  inicio,
  fim,
  anteriorInicio,
  anteriorFim,
}: Props) {
  const resultado = useMemo(() => {
    const atuais = selecionar(
      vendasAtuais, tipo, excluirRenovacao
    );

    const anteriores = selecionar(
      vendasAnteriores, tipo, excluirRenovacao
    );

    const valorAtual = metrica(atuais, tipo);
    const valorAnterior = metrica(anteriores, tipo);

    return {
      variacao: calcularVariacaoV65(valorAtual, valorAnterior),

      serie: serieComMovimento(
        atuais, tipo, inicio, fim
      ),

      totalDias: new Set(
        atuais.map(v =>
          String(v.data_fechamento ?? "").slice(0, 10)
        ).filter(data =>
          /^\d{4}-\d{2}-\d{2}$/.test(data) &&
          data >= inicio &&
          data <= fim
        )
      ).size,
    };
  }, [
    tipo,
    vendasAtuais,
    vendasAnteriores,
    excluirRenovacao,
    inicio,
    fim,
  ]);

  const { variacao, serie, totalDias } = resultado;

  const estado = classificarVariacaoV65(variacao);
  const subiu = estado === "positivo";
  const caiu = estado === "negativo";

  // cs-results-cores-funcionais-v49
  // A curva segue o mesmo estado da variacao.
  const cor =
    subiu ? "#12D995" :
    caiu ? "#F7304E" :
    "#A7B8CE";

  const statusCor =
    subiu ? "#12D995" :
    caiu ? "#F7304E" :
    "#AAB8CA";

  const percentual =
    variacao === null
      ? null
      : `${variacao > 0 ? "+" : ""}${variacao.toLocaleString(
          "pt-BR",
          {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }
        )}%`;

  const desenho = desenharLinha(serie);
  const id = `cs-trend-v47-${tipo}`;

  return (
    <div
      className="cs-results-trend-v44 cs-results-trend-v47"
      title={
        `Comparação: ${anteriorInicio} a ${anteriorFim}` +
        ` versus ${inicio} a ${fim}.` +
        ` Gráfico por dias com movimento.`
      }
    >
      <div className="cs-results-trend-copy">
        {percentual ? (
          <strong style={{ color: statusCor }}>
            <span aria-hidden="true">
              {subiu ? "↗" : caiu ? "↘" : "→"}
            </span>
            {" "}{percentual}
          </strong>
        ) : (
          <strong className="cs-results-no-base">
            Sem base anterior
          </strong>
        )}

        <span>
          {percentual
            ? "vs. período anterior"
            : "Comparação indisponível"}
        </span>
      </div>

      <div className="cs-results-v47-chart">
        {serie.length >= 2 ? (
          <svg
            viewBox="0 0 220 70"
            preserveAspectRatio="none"
            role="img"
            aria-label={
              `Evolução em ${totalDias} dias com movimento`
            }
          >
            <defs>
              <linearGradient
                id={id}
                x1="0" y1="0" x2="0" y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={cor}
                  stopOpacity=".32"
                />
                <stop
                  offset="100%"
                  stopColor={cor}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            <path
              d={desenho.area}
              fill={`url(#${id})`}
            />
            <path
              d={desenho.linha}
              fill="none"
              stroke={cor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : (
          <div className="cs-results-v47-empty">
            {totalDias === 1
              ? "1 dia com movimento"
              : "Sem movimentos no período"}
          </div>
        )}

        {serie.length >= 2 && (
          <span className="cs-results-v47-caption">
            {totalDias} dias com movimento
          </span>
        )}
      </div>
    </div>
  );
}
