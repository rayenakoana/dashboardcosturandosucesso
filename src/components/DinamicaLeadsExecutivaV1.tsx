import { CsDatePicker } from "@/components/CsDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { FUNIL_CORES } from "@/lib/funis";
import "@/styles/csDinamicaLeadsV1.css";

// cs-dinamica-leads-executiva-v1

type Periodo = "pagina" | "hoje" | "sete" | "mes" | "custom";

interface Props {
  paginaInicio: string;
  paginaFim: string;
  funisSelecionados: string[];
  idsFunis: string[];
  todosFunis: boolean;
}

interface LeadRow {
  data: string | null;
  funil: string | null;
  pipeline_id: string | null;
  total_leads: number | null;
}

const CORES = [
  "#F7304E",
  "#F28B25",
  "#9B42DA",
  "#11CFA4",
  "#287DEC",
  "#E33E9C",
  "#17ADC6",
];

function dataLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function adicionarDias(data: string, quantidade: number) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + quantidade);
  return d.toISOString().slice(0, 10);
}

function diasEntre(inicio: string, fim: string) {
  const a = Date.parse(`${inicio}T12:00:00Z`);
  const b = Date.parse(`${fim}T12:00:00Z`);
  return Math.round((b - a) / 86400000) + 1;
}

function formatarData(data: string) {
  return data.split("-").reverse().join("/");
}

function obterNome(row: LeadRow) {
  const nome = (row.funil ?? "").trim();
  if (nome) return nome;

  if (row.pipeline_id) {
    return `Funil ID ${row.pipeline_id}`;
  }

  return "Funil não identificado";
}

function obterCor(nome: string, indice: number) {
  if (nome.startsWith("Funil ID ") ||
      nome === "Funil não identificado") {
    return "#8794A8";
  }

  return FUNIL_CORES[nome] ?? CORES[indice % CORES.length];
}

async function consultarLeads(
  inicio: string,
  fim: string,
  todosFunis: boolean,
  idsFunis: string[]
): Promise<LeadRow[]> {
  if (!todosFunis && idsFunis.length === 0) return [];

  const resultado: LeadRow[] = [];

  for (let offset = 0; offset < 50000; offset += 1000) {
    let consulta = supabase
      .from("leads_diarios_por_funil")
      .select("data, funil, pipeline_id, total_leads")
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true })
      .range(offset, offset + 999);

    if (!todosFunis) {
      consulta = consulta.in("pipeline_id", idsFunis);
    }

    const { data, error } = await consulta;

    if (error) throw error;

    const pagina = (data ?? []) as LeadRow[];
    resultado.push(...pagina);

    if (pagina.length < 1000) return resultado;
  }

  throw new Error(
    "Consulta excedeu 50 mil registros. " +
    "É necessário revisar a paginação."
  );
}

export function DinamicaLeadsExecutivaV1({
  paginaInicio,
  paginaFim,
  funisSelecionados,
  idsFunis,
  todosFunis,
}: Props) {
  const [periodo, setPeriodo] = useState<Periodo>("pagina");
  const [customInicio, setCustomInicio] = useState(paginaInicio);
  const [customFim, setCustomFim] = useState(paginaFim);

  // cs-dinamica-leads-v12
  const [funilDestaque, setFunilDestaque] =
    useState<string | null>(null);

  const [diaSelecionado, setDiaSelecionado] =
    useState<string | null>(null);

  // cs-dinamica-leads-v13
  const [mostrarTodosFunis, setMostrarTodosFunis] =
    useState(false);

  // cs-ranking-executivo-v18
  const [funilHover, setFunilHover] =
    useState<string | null>(null);

  const hoje = dataLocal(new Date());

  const intervalo = useMemo(() => {
    if (periodo === "pagina") {
      return { inicio: paginaInicio, fim: paginaFim };
    }

    if (periodo === "hoje") {
      return { inicio: hoje, fim: hoje };
    }

    if (periodo === "sete") {
      return { inicio: adicionarDias(hoje, -6), fim: hoje };
    }

    if (periodo === "mes") {
      return { inicio: hoje.slice(0, 7) + "-01", fim: hoje };
    }

    return { inicio: customInicio, fim: customFim };
  }, [
    periodo,
    paginaInicio,
    paginaFim,
    customInicio,
    customFim,
    hoje,
  ]);

  const { inicio, fim } = intervalo;
  const duracao = diasEntre(inicio, fim);
  const periodoValido =
    Boolean(inicio && fim) &&
    duracao > 0 &&
    duracao <= 366;

  const anteriorInicio = periodoValido
    ? adicionarDias(inicio, -duracao)
    : "";

  const anteriorFim = periodoValido
    ? adicionarDias(inicio, -1)
    : "";

  const chaveIds = idsFunis.join("|");

  const consulta = useQuery({
    queryKey: [
      "cs-dinamica-leads-v1",
      inicio,
      fim,
      anteriorInicio,
      anteriorFim,
      todosFunis,
      chaveIds,
    ],
    enabled: periodoValido,
    queryFn: async () => {
      const [atual, anterior] = await Promise.all([
        consultarLeads(inicio, fim, todosFunis, idsFunis),
        consultarLeads(
          anteriorInicio,
          anteriorFim,
          todosFunis,
          idsFunis
        ),
      ]);

      return { atual, anterior };
    },
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const resumo = useMemo(() => {
    const atuais = consulta.data?.atual ?? [];
    const anteriores = consulta.data?.anterior ?? [];

    const soma = (rows: LeadRow[]) =>
      rows.reduce(
        (total, row) => total + Number(row.total_leads ?? 0),
        0
      );

    const total = soma(atuais);
    const anterior = soma(anteriores);

    const porFunil = new Map<string, number>();
    const porDia = new Map<string, Map<string, number>>();
    let semNome = 0;

    for (const row of atuais) {
      const volume = Number(row.total_leads ?? 0);
      const nome = obterNome(row);

      if (!row.funil?.trim()) {
        semNome += volume;
      }

      porFunil.set(
        nome,
        (porFunil.get(nome) ?? 0) + volume
      );

      const dia = String(row.data ?? "").slice(0, 10);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
        continue;
      }

      if (!porDia.has(dia)) {
        porDia.set(dia, new Map());
      }

      const mapa = porDia.get(dia)!;
      mapa.set(nome, (mapa.get(nome) ?? 0) + volume);
    }

    const anteriorPorFunil = new Map<string, number>();

    for (const row of anteriores) {
      const nome = obterNome(row);
      anteriorPorFunil.set(
        nome,
        (anteriorPorFunil.get(nome) ?? 0)
          + Number(row.total_leads ?? 0)
      );
    }

    const ranking = [...porFunil.entries()]
      .map(([nome, quantidade]) => ({
        nome,
        quantidade,
      }))
      .filter(item => item.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade)
      .map((item, indice) => ({
        ...item,
        cor: obterCor(item.nome, indice),
        chave: `f${indice}`,
        anteriorFunil:
          anteriorPorFunil.get(item.nome) ?? 0,
        percentual: total > 0
          ? (item.quantidade / total) * 100
          : 0,
      }));

    const serie: Record<string, string | number>[] = [];

    if (periodoValido) {
      for (let i = 0; i < duracao; i++) {
        const dia = adicionarDias(inicio, i);
        const valores = porDia.get(dia);

        const ponto: Record<string, string | number> = {
          dia,
        };

        for (const item of ranking) {
          ponto[item.chave] =
            valores?.get(item.nome) ?? 0;
        }

        serie.push(ponto);
      }
    }

    const variacao = anterior > 0
      ? ((total - anterior) / anterior) * 100
      : null;

    return {
      total,
      anterior,
      variacao,
      ranking,
      serie,
      semNome,
      diasComDados: porDia.size,
    };
  }, [
    consulta.data,
    periodoValido,
    inicio,
    duracao,
  ]);

  const foco = resumo.ranking.find(
    item => item.nome === funilDestaque
  ) ?? null;

  const destaqueVisual = resumo.ranking.find(
    item => item.nome === (funilDestaque ?? funilHover)
  ) ?? null;

  const variacaoFunil =
    foco && foco.anteriorFunil > 0
      ? (
          (foco.quantidade - foco.anteriorFunil)
          / foco.anteriorFunil
        ) * 100
      : null;

  const diaAtivo = resumo.serie.find(
    ponto => ponto.dia === diaSelecionado
  );

  const totalDiaAtivo = diaAtivo
    ? resumo.ranking.reduce(
        (soma, item) =>
          soma + Number(diaAtivo[item.chave] ?? 0),
        0
      )
    : null;

  const variacaoTexto =
    resumo.variacao === null
      ? "Sem base anterior"
      : `${resumo.variacao > 0 ? "+" : ""}${resumo.variacao
          .toFixed(1)
          .replace(".", ",")}%`;

  const estado =
    resumo.variacao === null
      ? "neutro"
      : resumo.variacao > 0
        ? "positivo"
        : resumo.variacao < 0
          ? "negativo"
          : "neutro";

  return (
    <section className="cs-dyn-v1" aria-label="Chegada de leads">
      <div className="cs-dyn-v1-head">
        <div className="cs-dyn-v1-heading">
          <strong>CHEGADA DE LEADS</strong>
          <span>Entrada diária e participação por funil</span>
        </div>

        <div className="cs-dyn-v1-filters">
          <label htmlFor="cs-dyn-v1-periodo">
            Período dos leads
          </label>
          {/* cs-dinamica-controles-v14 */}
          <Select
            value={periodo}
            onValueChange={(valor) =>
              setPeriodo(valor as Periodo)
            }
          >
            <SelectTrigger
              id="cs-dyn-v1-periodo"
              className="cs-dyn-v14-trigger"
              aria-label="Período dos leads"
            >
              <SelectValue placeholder="Selecionar período" />
            </SelectTrigger>

            <SelectContent
              position="popper"
              sideOffset={6}
              className="cs-dyn-v14-content"
            >
              <SelectItem value="pagina">
                Período da página
              </SelectItem>
              <SelectItem value="hoje">
                Hoje
              </SelectItem>
              <SelectItem value="sete">
                Últimos 7 dias
              </SelectItem>
              <SelectItem value="mes">
                Este mês
              </SelectItem>
              <SelectItem value="custom">
                Personalizado
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* cs-dinamica-calendario-v15 */}
      {periodo === "custom" && (
        <div className="cs-dyn-v1-custom">
          <div className="cs-dyn-v15-date-field">
            <span className="cs-dyn-v15-date-label">
              De
            </span>
            <CsDatePicker
              value={customInicio}
              onChange={setCustomInicio}
              placeholder="Data inicial"
              ariaLabel="Data inicial dos leads"
            />
          </div>

          <div className="cs-dyn-v15-date-field">
            <span className="cs-dyn-v15-date-label">
              Até
            </span>
            <CsDatePicker
              value={customFim}
              onChange={setCustomFim}
              placeholder="Data final"
              ariaLabel="Data final dos leads"
            />
          </div>
        </div>
      )}

      <div className="cs-dyn-v1-context">
        {periodoValido
          ? `${formatarData(inicio)} — ${formatarData(fim)}`
          : "Selecione um intervalo válido de até 366 dias"}
        <span>
          {todosFunis
            ? "Todos os funis"
            : `${funisSelecionados.length} funil(is) selecionado(s)`}
        </span>
      </div>

      {!periodoValido ? (
        <div className="cs-dyn-v1-message">
          Ajuste as datas do período personalizado.
        </div>
      ) : consulta.isLoading ? (
        <div className="cs-dyn-v1-message">
          Consultando a evolução de leads...
        </div>
      ) : consulta.isError ? (
        <div className="cs-dyn-v1-message cs-dyn-v1-error">
          Não foi possível consultar os leads.
          <small>
            {consulta.error instanceof Error
              ? consulta.error.message
              : "Verifique a origem dos dados."}
          </small>
        </div>
      ) : (
        <>
          <div className="cs-dyn-v1-grid">
            <div className="cs-dyn-v1-chart">
              <div className="cs-dyn-v1-column-title">
                <strong>Evolução diária</strong>
                <span>
                  {resumo.diasComDados} dias com registros
                </span>
              </div>

              {resumo.total > 0 ? (
                <div className="cs-dyn-v1-chartbox">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={resumo.serie}
                      onClick={(evento: any) => {
                        const dia = String(
                          evento?.activeLabel ?? ""
                        );

                        if (/^\d{4}-\d{2}-\d{2}$/.test(dia)) {
                          setDiaSelecionado(
                            anterior =>
                              anterior === dia ? null : dia
                          );
                        }
                      }}
                      margin={{
                        top: 10,
                        right: 6,
                        bottom: 0,
                        left: -22,
                      }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(137,153,178,.13)"
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="dia"
                        axisLine={false}
                        tickLine={false}
                        minTickGap={16}
                        tickFormatter={v =>
                          `${String(v).slice(8, 10)}/${String(v).slice(5, 7)}`
                        }
                        tick={{
                          fill: "#91A2BA",
                          fontSize: 10,
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#91A2BA",
                          fontSize: 10,
                        }}
                      />
                      <Tooltip cursor={false}
                        contentStyle={{
                          background: "#18212E",
                          border: "1px solid #344255",
                          borderRadius: 8,
                          color: "#FFFFFF",
                        }}
                        labelFormatter={v =>
                          formatarData(String(v))
                        }
                        formatter={(valor, nome) => {
                          const item = resumo.ranking.find(
                            r => r.chave === String(nome)
                          );

                          return [
                            Number(valor ?? 0).toLocaleString("pt-BR"),
                            item?.nome ?? String(nome),
                          ];
                        }}
                      />
                      {resumo.ranking.map(item => (
                        <Bar
                          key={item.chave}
                          dataKey={item.chave}
                          stackId="leads"
                          fill={item.cor}
                          fillOpacity={
                            destaqueVisual && destaqueVisual.nome !== item.nome
                              ? 0.16
                              : 1
                          }
                          maxBarSize={32}
                          isAnimationActive={false}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="cs-dyn-v1-chart-empty">
                  Sem leads registrados nesse intervalo.
                </div>
              )}

              {diaAtivo && (
                <div className="cs-dyn-v12-day">
                  <span>
                    {formatarData(String(diaAtivo.dia))}
                    <strong>
                      {totalDiaAtivo?.toLocaleString("pt-BR")}
                      {" leads"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDiaSelecionado(null)}
                  >
                    Limpar seleção
                  </button>
                </div>
              )}
            </div>

            <div className="cs-dyn-v1-total">
              <strong>
                {resumo.total.toLocaleString("pt-BR")}
              </strong>
              <span>Leads no período</span>

              {foco && (
                <div className="cs-dyn-v12-focus">
                  <small>FUNIL EM DESTAQUE</small>
                  <strong style={{ color: foco.cor }}>
                    {foco.quantidade.toLocaleString("pt-BR")}
                  </strong>
                  <span>{foco.nome}</span>
                  {/* cs-dinamica-compare-v191 */}
<small
  className="cs-dyn-v18-compare"
  data-estado={
    variacaoFunil === null
      ? "neutro"
      : variacaoFunil > 0
        ? "positivo"
        : variacaoFunil < 0
          ? "negativo"
          : "neutro"
  }
>
  {variacaoFunil === null ? (
    <span>Sem base anterior</span>
  ) : (
    <>
      <strong className="cs-dyn-v191-percent">
        {`${variacaoFunil > 0 ? "+" : ""}${variacaoFunil
          .toFixed(1)
          .replace(".", ",")}%`}
      </strong>
      <span className="cs-dyn-v191-caption">
        vs. período anterior
      </span>
    </>
  )}
</small>
                  <button
                    type="button"
                    onClick={() => setFunilDestaque(null)}
                  >
                    Mostrar todos
                  </button>
                </div>
              )}
              {/* cs-dinamica-acabamento-v19 */}
              <span className="cs-dyn-v19-overall-label">
                EVOLUÇÃO GERAL DOS LEADS
              </span>
              <b data-estado={estado}>
                {variacaoTexto}
              </b>
              <small>
                vs. período anterior
                {resumo.anterior > 0
                  ? ` (${resumo.anterior.toLocaleString("pt-BR")} leads)`
                  : ""}
              </small>
            </div>

            <div className="cs-dyn-v1-ranking">
              <div className="cs-dyn-v1-column-title">
                <strong>Principais funis</strong>
                <span>Participação</span>
              </div>

              <div className="cs-dyn-v18-context">
                <span>
                  <strong>{resumo.ranking.length}</strong>
                  {" funis com leads"}
                </span>

                {resumo.ranking.length > 0 && (
                  <span>
                    <strong>
                      {resumo.ranking[0].percentual
                        .toFixed(1)
                        .replace(".", ",")}%
                    </strong>
                    {" do volume no líder"}
                  </span>
                )}
              </div>

              {resumo.ranking.length > 0 ? (
                <>
                  <div className="cs-dyn-v1-ranking-list">
                  {resumo.ranking
                    .slice(0, mostrarTodosFunis ? undefined : 5)
                    .map((item, indice) => (
                    <div
                      key={item.nome}
                      className="cs-dyn-v1-ranking-row"
                      data-lider={indice === 0}
                      onMouseEnter={() => setFunilHover(item.nome)}
                      onMouseLeave={() => setFunilHover(null)}
                      onFocus={() => setFunilHover(item.nome)}
                      onBlur={() => setFunilHover(null)}
                      style={{
                        borderColor:
                          funilDestaque === item.nome
                            ? item.cor
                            : undefined,
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={funilDestaque === item.nome}
                      data-ativo={funilDestaque === item.nome}
                      aria-label={`Destacar ${item.nome} no gráfico`}
                      onClick={() => {
                        setFunilDestaque(
                          anterior =>
                            anterior === item.nome
                              ? null
                              : item.nome
                        );
                      }}
                      onKeyDown={(evento) => {
                        if (
                          evento.key === "Enter" ||
                          evento.key === " "
                        ) {
                          evento.preventDefault();
                          setFunilDestaque(
                            anterior =>
                              anterior === item.nome
                                ? null
                                : item.nome
                          );
                        }
                      }}
                    >
                      <div className="cs-dyn-v1-ranking-info">
                        <b
                          className="cs-dyn-v18-rank"
                          aria-hidden="true"
                        >
                          {String(indice + 1).padStart(2, "0")}
                        </b>
                        <i style={{ background: item.cor }} />
                        <span className="cs-dyn-v18-name">
                          {item.nome}
                        </span>
                        {indice === 0 && (
                          <em className="cs-dyn-v18-leader">
                            Líder
                          </em>
                        )}
                        <strong>
                          {item.quantidade.toLocaleString("pt-BR")}
                        </strong>
                      </div>
                      <div className="cs-dyn-v1-track">
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, item.percentual))}%`,
                            background: item.cor,
                          }}
                        />
                      </div>
                      <small>
                        {item.percentual
                          .toFixed(1)
                          .replace(".", ",")}%
                      </small>
                    </div>
                  ))}
                  </div>

                  {resumo.ranking.length > 5 && (
                    <button
                      type="button"
                      className="cs-dyn-v13-expand"
                      aria-expanded={mostrarTodosFunis}
                      onClick={() => {
                        if (mostrarTodosFunis) {
                          setFunilDestaque(null);
                        }
                        setMostrarTodosFunis(!mostrarTodosFunis);
                      }}
                    >
                      {mostrarTodosFunis
                        ? "Mostrar menos"
                        : `Mostrar outros ${
                            resumo.ranking.length - 5
                          } funis`}
                    </button>
                  )}
                </>
              ) : (
                <p className="cs-dyn-v1-ranking-empty">
                  Sem distribuição para apresentar.
                </p>
              )}
            </div>
          </div>

          {resumo.semNome > 0 && (
            <p className="cs-dyn-v1-notice">
              Atenção: {resumo.semNome.toLocaleString("pt-BR")} leads
              estão sem o nome do funil na origem.
              Quando disponível, exibimos o ID do pipeline,
              sem inventar uma classificação.
            </p>
          )}
        </>
      )}
    </section>
  );
}
