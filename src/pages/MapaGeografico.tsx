import { GeoDateField } from "@/components/GeoDateField";
import { useState, useMemo, useRef, useEffect } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import { GlassCard } from "@/components/GlassCard";
import { useLeadsGeografia } from "@/hooks/useLeadsGeografia";
import { useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { Globe2, MapPin, ArrowLeft, Download, CalendarDays } from "lucide-react";
import { PIPELINE_IDS } from "@/lib/funis";

// Nomes dos países como aparecem no world-countries.json (Natural Earth) vs. nomes que usamos internamente
const NOME_PAIS_MAPA: Record<string, string> = {
  "Brasil": "Brazil",
  "Paraguai": "Paraguay",
  "Uruguai": "Uruguay",
  "Bolívia": "Bolivia",
  "Equador": "Ecuador",
  "Argentina": "Argentina",
  "Chile": "Chile",
  "Colômbia": "Colombia",
  "Venezuela": "Venezuela",
  "Peru": "Peru",
  "Portugal": "Portugal",
  "Espanha": "Spain",
  "Itália": "Italy",
  "Alemanha": "Germany",
  "França": "France",
  "Reino Unido": "United Kingdom",
  "Estados Unidos/Canadá": "United States of America",
};


// cs-geo-regional-v6
const REGIOES_BR = [
  "Sudeste",
  "Sul",
  "Nordeste",
  "Centro-Oeste",
  "Norte",
] as const;

const REGIAO_UF: Record<string, string> = {
  SP: "Sudeste", RJ: "Sudeste",
  MG: "Sudeste", ES: "Sudeste",
  PR: "Sul", SC: "Sul", RS: "Sul",
  BA: "Nordeste", SE: "Nordeste",
  AL: "Nordeste", PE: "Nordeste",
  PB: "Nordeste", RN: "Nordeste",
  CE: "Nordeste", PI: "Nordeste",
  MA: "Nordeste",
  GO: "Centro-Oeste", MT: "Centro-Oeste",
  MS: "Centro-Oeste", DF: "Centro-Oeste",
  AM: "Norte", PA: "Norte",
  AC: "Norte", AP: "Norte",
  RO: "Norte", RR: "Norte",
  TO: "Norte",
};

const REGIAO_ESTADO: Record<string, string> = {
  "sao paulo": "Sudeste",
  "rio de janeiro": "Sudeste",
  "minas gerais": "Sudeste",
  "espirito santo": "Sudeste",
  "parana": "Sul",
  "santa catarina": "Sul",
  "rio grande do sul": "Sul",
  "bahia": "Nordeste",
  "sergipe": "Nordeste",
  "alagoas": "Nordeste",
  "pernambuco": "Nordeste",
  "paraiba": "Nordeste",
  "rio grande do norte": "Nordeste",
  "ceara": "Nordeste",
  "piaui": "Nordeste",
  "maranhao": "Nordeste",
  "goias": "Centro-Oeste",
  "mato grosso": "Centro-Oeste",
  "mato grosso do sul": "Centro-Oeste",
  "distrito federal": "Centro-Oeste",
  "amazonas": "Norte",
  "para": "Norte",
  "acre": "Norte",
  "amapa": "Norte",
  "rondonia": "Norte",
  "roraima": "Norte",
  "tocantins": "Norte",
};

function textoGeoNormalizado(valor: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obterRegiaoGeo(
  uf: string | null,
  estado: string | null,
  regiao: string | null
) {
  const sigla = (uf || "").trim().toUpperCase();
  if (REGIAO_UF[sigla]) return REGIAO_UF[sigla];

  const estadoNormalizado = textoGeoNormalizado(estado);
  if (REGIAO_UF[estadoNormalizado.toUpperCase()]) {
    return REGIAO_UF[estadoNormalizado.toUpperCase()];
  }
  if (REGIAO_ESTADO[estadoNormalizado]) {
    return REGIAO_ESTADO[estadoNormalizado];
  }

  const regiaoNormalizada = textoGeoNormalizado(regiao)
    .replace(/^regiao\s+/, "");

  const encontrados = REGIOES_BR.find(
    r => textoGeoNormalizado(r) === regiaoNormalizada
  );

  return encontrados || "Não identificada";
}

// cs-geo-periodo-v16
type PeriodoGeo =
  "todos" | "7d" | "30d" | "90d" | "mes" | "personalizado";

const formatadorDiaGeo = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function diaGeoSP(data: Date): string {
  const partes = formatadorDiaGeo.formatToParts(data);
  const parte = (tipo: string) =>
    partes.find(p => p.type === tipo)?.value ?? "";

  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

function diasAntesGeo(dia: string, dias: number): string {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

type View = "mundo" | "estados" | "cidades";

export default function MapaGeografico({ formatarKpisAnalises = false }: { formatarKpisAnalises?: boolean }) {
  const { data: rows = [], isLoading } = useLeadsGeografia();
  const { funisVisiveis: FUNIS } = useFunisVisiveis();
  const [funisSel, setFunisSel] = useState<string[]>([]);
  const [periodoGeo, setPeriodoGeo] = useState<PeriodoGeo>("todos");
  const [inicioDigitado, setInicioDigitado] = useState("");
  const [fimDigitado, setFimDigitado] = useState("");
  const [periodoCustom, setPeriodoCustom] =
    useState<{ inicio: string; fim: string } | null>(null);
  const [view, setView] = useState<View>("estados");
  // cs-geo-foco-regional-v10
  const [regiaoEmFoco, setRegiaoEmFoco] = useState<string | null>(null);
  // cs-geo-modos-v14
  const [modoMatrizRegional, setModoMatrizRegional] =
    useState<"volume" | "participacao">("volume");
  // cs-geo-foco-feedback-v11
  const mapaFocoRef = useRef<HTMLDivElement>(null);
  const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ nome: string; leads: number; x: number; y: number } | null>(null);

  const todosSelecionados = funisSel.length === 0;

  const rowsFiltradas = useMemo(() => {
    const ids = new Set(
      funisSel.map(f => PIPELINE_IDS[f]).filter(Boolean)
    );
    const hoje = diaGeoSP(new Date());

    let janela: { inicio: string; fim: string } | null = null;

    if (periodoGeo === "7d")
      janela = { inicio: diasAntesGeo(hoje, 6), fim: hoje };

    if (periodoGeo === "30d")
      janela = { inicio: diasAntesGeo(hoje, 29), fim: hoje };

    if (periodoGeo === "90d")
      janela = { inicio: diasAntesGeo(hoje, 89), fim: hoje };

    if (periodoGeo === "mes")
      janela = {
        inicio: `${hoje.slice(0, 7)}-01`,
        fim: hoje,
      };

    if (periodoGeo === "personalizado")
      janela = periodoCustom;

    return rows.filter(r => {
      if (
        !todosSelecionados &&
        !ids.has(r.pipeline_id ?? "")
      ) return false;

      if (!janela) return true;
      if (!r.created_at) return false;

      const data = new Date(r.created_at);
      if (Number.isNaN(data.getTime())) return false;

      const dia = diaGeoSP(data);
      return dia >= janela.inicio && dia <= janela.fim;
    });
  }, [
    rows,
    funisSel,
    todosSelecionados,
    periodoGeo,
    periodoCustom,
  ]);

  // === Agregações ===
  const porPais = useMemo(() => {
    const map: Record<string, number> = {};
    rowsFiltradas.forEach(r => {
      const p = r.pais || "Não identificado";
      map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [rowsFiltradas]);

  const porEstado = useMemo(() => {
    const map: Record<string, { leads: number; uf: string }> = {};
    rowsFiltradas.forEach(r => {
      if (r.pais !== "Brasil" || !r.estado) return;
      if (!map[r.estado]) map[r.estado] = { leads: 0, uf: r.uf || "" };
      map[r.estado].leads += 1;
    });
    return map;
  }, [rowsFiltradas]);

  const cidadesDoEstado = useMemo(() => {
    if (!estadoSelecionado) return [];
    const map: Record<string, number> = {};
    let semCidade = 0;
    rowsFiltradas.forEach(r => {
      if (r.estado !== estadoSelecionado) return;
      if (r.cidade && r.cidade.trim()) {
        map[r.cidade] = (map[r.cidade] || 0) + 1;
      } else {
        semCidade++;
      }
    });
    const arr = Object.entries(map).map(([nome, leads]) => ({ nome, leads })).sort((a, b) => b.leads - a.leads);
    if (semCidade > 0) arr.push({ nome: "Cidade não informada", leads: semCidade });
    return arr;
  }, [rowsFiltradas, estadoSelecionado]);

  const totalGeral = rowsFiltradas.length;
  const totalBrasil = porPais["Brasil"] || 0;
  const totalInternacional = totalGeral - totalBrasil - (porPais["Não identificado"] || 0);
  const naoIdentificado = porPais["Não identificado"] || 0;

  const paisesInternacionais = useMemo(() => {
    return Object.entries(porPais)
      .filter(([nome]) => nome !== "Brasil" && nome !== "Não identificado")
      .sort(([, a], [, b]) => b - a);
  }, [porPais]);

  const estadosRanking = useMemo(() => {
    return Object.entries(porEstado)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.leads - a.leads);
  }, [porEstado]);



  const funisMatriz = FUNIS.filter(
    f => todosSelecionados || funisSel.includes(f)
  );

  const matrizRegional = useMemo(() => {
    const mapa = new Map<
      string,
      { nome: string; total: number; porFunil: Record<string, number> }
    >();

    rowsFiltradas.forEach(r => {
      if (r.pais !== "Brasil") return;

      const nome = obterRegiaoGeo(r.uf, r.estado, r.regiao);
      let item = mapa.get(nome);

      if (!item) {
        item = { nome, total: 0, porFunil: {} };
        mapa.set(nome, item);
      }

      item.total += 1;

      if (r.pipeline_id) {
        item.porFunil[r.pipeline_id] =
          (item.porFunil[r.pipeline_id] || 0) + 1;
      }
    });

    const ordem = [...REGIOES_BR, "Não identificada"];

    return ordem
      .map(nome => mapa.get(nome))
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
  }, [rowsFiltradas]);

  const maximoRegionalPorFunil = useMemo(() => {
    const maximos: Record<string, number> = {};

    matrizRegional.forEach(r => {
      Object.entries(r.porFunil).forEach(([id, qtd]) => {
        maximos[id] = Math.max(maximos[id] || 0, qtd);
      });
    });

    return maximos;
  }, [matrizRegional]);


  const totaisRegionaisPorFunil = useMemo(() => {
    const resultado: Record<string, number> = {};

    matrizRegional.forEach(linha => {
      Object.entries(linha.porFunil).forEach(([id, valor]) => {
        resultado[id] = (resultado[id] || 0) + valor;
      });
    });

    return resultado;
  }, [matrizRegional]);

  const totalOutrosRegional = matrizRegional.reduce(
    (acumulado, linha) => {
      const identificados = funisMatriz.reduce(
        (soma, f) =>
          soma + (linha.porFunil[PIPELINE_IDS[f]] || 0),
        0
      );

      return acumulado + Math.max(0, linha.total - identificados);
    },
    0
  );

  // === Exportar relatório CSV ===
  function exportarCSV() {
    const linhas = [["Tipo", "Nome", "Leads"]];
    linhas.push(["País", "Brasil", String(totalBrasil)]);
    paisesInternacionais.forEach(([nome, leads]) => linhas.push(["País", nome, String(leads)]));
    estadosRanking.forEach(e => linhas.push(["Estado (BR)", e.nome, String(e.leads)]));
    if (estadoSelecionado) {
      cidadesDoEstado.forEach(c => linhas.push([`Cidade (${estadoSelecionado})`, c.nome, String(c.leads)]));
    }
    const csv = linhas.map(l => l.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-leads-geografico-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cs-geo-layout-v3 w-full min-w-0 space-y-5 pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa Geográfico</h1>
          <p className="text-sm text-muted-foreground">Distribuição de leads por país, estado e região</p>
        </div>
        <button
          onClick={exportarCSV}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:border-primary/50 transition-colors self-start md:self-auto"
        >
          <Download className="h-4 w-4" /> Exportar relatório (CSV)
        </button>
      </div>

      {/* Filtro de funis */}
      <div className="flex gap-2 flex-wrap">
        <button className={`fchip ${todosSelecionados ? "active" : ""}`} onClick={() => setFunisSel([])}>
          Todos os funis
        </button>
        {FUNIS.map(f => (
          <button
            key={f}
            className={`fchip ${funisSel.includes(f) ? "active" : ""}`}
            onClick={() => setFunisSel(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Filtro temporal da Geografia V16 */}
      <div className="cs-geo-periodo-v16-1 flex flex-wrap items-center gap-3 rounded-xl
        border border-border/60 bg-card/35 px-3 py-3 sm:px-4">

        <span className="inline-flex items-center gap-2
          text-xs font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          Período
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            ["todos", "Tudo"],
            ["7d", "7 dias"],
            ["30d", "30 dias"],
            ["90d", "90 dias"],
            ["mes", "Este mês"],
          ] as [PeriodoGeo, string][]).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              aria-pressed={periodoGeo === id}
              onClick={() => setPeriodoGeo(id)}
              className={`rounded-lg border px-3 py-1.5
                text-xs font-medium transition-colors ${
                periodoGeo === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-background/30 text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <GeoDateField
            label="De"
            value={inicioDigitado}
            onChange={valor => {
              setInicioDigitado(valor);
              if (fimDigitado && valor > fimDigitado) {
                setFimDigitado("");
              }
            }}
          />

          <GeoDateField
            label="Até"
            value={fimDigitado}
            minDate={inicioDigitado || undefined}
            onChange={setFimDigitado}
          />

          <button
            type="button"
            disabled={
              !inicioDigitado ||
              !fimDigitado ||
              inicioDigitado > fimDigitado
            }
            onClick={() => {
              setPeriodoCustom({
                inicio: inicioDigitado,
                fim: fimDigitado,
              });
              setPeriodoGeo("personalizado");
            }}
            className={`rounded-lg border px-3 py-1.5
              text-xs font-semibold transition-colors
              disabled:cursor-not-allowed disabled:opacity-40 ${
              periodoGeo === "personalizado"
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border/70 text-foreground hover:border-primary/50"
            }`}
          >
            Aplicar datas
          </button>
        </div>

        <p className="w-full text-[11px] text-muted-foreground">
          O período considera a data disponível no histórico geográfico.
          As datas inicial e final estão incluídas.
        </p>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="cs-geo-kpi-v3 p-5">
          <p className="text-[11px] font-medium tracking-[0.03em] text-muted-foreground mb-2">Registros analisados</p>
          <p className="text-[30px] font-bold tracking-[-0.035em] tabular-nums">{isLoading ? "—" : (formatarKpisAnalises ? totalGeral.toLocaleString("pt-BR") : totalGeral)}</p>
        </GlassCard>
        <GlassCard className="cs-geo-kpi-v3 p-5">
          <p className="text-[11px] font-medium tracking-[0.03em] text-muted-foreground mb-2">Brasil</p>
          <p className="text-[30px] font-bold tracking-[-0.035em] tabular-nums text-foreground">{isLoading ? "—" : (formatarKpisAnalises ? totalBrasil.toLocaleString("pt-BR") : totalBrasil)}</p>
        </GlassCard>
        <GlassCard className="cs-geo-kpi-v3 p-5">
          <p className="text-[11px] font-medium tracking-[0.03em] text-muted-foreground mb-2">Internacional</p>
          <p className="text-[30px] font-bold tracking-[-0.035em] tabular-nums text-foreground">{isLoading ? "—" : (formatarKpisAnalises ? totalInternacional.toLocaleString("pt-BR") : totalInternacional)}</p>
        </GlassCard>
        <GlassCard className="cs-geo-kpi-v3 p-5">
          <p className="text-[11px] font-medium tracking-[0.03em] text-muted-foreground mb-2">Não identificado</p>
          <p className="text-[30px] font-bold tracking-[-0.035em] tabular-nums text-muted-foreground">{isLoading ? "—" : (formatarKpisAnalises ? naoIdentificado.toLocaleString("pt-BR") : naoIdentificado)}</p>
        </GlassCard>
      </div>

      <div
        ref={mapaFocoRef}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 scroll-mt-5"
      >
        {/* Mapa */}
        <GlassCard className="cs-geo-brasil-panel p-6 lg:col-span-2 min-h-[420px]">
          <div className="flex items-center gap-2 mb-3">
            {view !== "mundo" && (
              <button
                onClick={() => { if (view === "cidades") { setView("estados"); setEstadoSelecionado(null); } else { setView("mundo"); } }}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> voltar
              </button>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              {view === "mundo" && <><Globe2 className="h-3.5 w-3.5" /> Mundo</>}
              {view === "estados" && <><MapPin className="h-3.5 w-3.5" /> Brasil · estados</>}
              {view === "cidades" && <><MapPin className="h-3.5 w-3.5" /> {estadoSelecionado}</>}
            </p>
          </div>

          {view === "estados" && regiaoEmFoco && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-primary/30 bg-primary/10
                px-3 py-1.5 text-xs font-semibold text-foreground">
                Região em destaque: {regiaoEmFoco}
              </span>
              <button
                type="button"
                onClick={() => setRegiaoEmFoco(null)}
                className="text-xs text-muted-foreground hover:text-foreground
                  underline underline-offset-4"
              >
                Limpar destaque
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">Carregando dados...</div>
          ) : view === "mundo" ? (
            <WorldMap porPais={porPais} onClickBrasil={() => setView("estados")} onHover={setHoverInfo} />
          ) : view === "estados" ? (
            <BrazilMap
              porEstado={porEstado}
              regiaoEmFoco={regiaoEmFoco}
              onClickEstado={(nome) => { setEstadoSelecionado(nome); setView("cidades"); }}
              onHover={setHoverInfo}
            />
          ) : (
            <CidadesList cidades={cidadesDoEstado} />
          )}
        </GlassCard>

        {/* Painel lateral / relatório */}
        <div className="space-y-4">
          <GlassCard className="cs-geo-ranking-v3 p-5">
            <p className="text-sm font-medium mb-3">Top estados (Brasil)</p>
            {estadosRanking.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados no período/filtro selecionado</p>
            ) : (
              <div className="space-y-2.5">
                {estadosRanking.slice(0, 10).map(e => {
                  const max = estadosRanking[0]?.leads || 1;
                  return (
                    <button
                      key={e.nome}
                      onClick={() => { setEstadoSelecionado(e.nome); setView("cidades"); }}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center justify-between gap-3 text-[12px] mb-1.5">
                        <span className="group-hover:text-primary transition-colors">{e.nome}</span>
                        <span className="flex items-center gap-3 shrink-0 tabular-nums">
      <span className="text-muted-foreground text-[11px]">
        {totalBrasil > 0
          ? `${((e.leads / totalBrasil) * 100).toFixed(1).replace(".", ",")}%`
          : "0,0%"}
      </span>
      <span className="font-semibold text-foreground">
        {e.leads.toLocaleString("pt-BR")}
      </span>
    </span>
                      </div>
                      <div className="cs-geo-ranking-track h-[5px] rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full bg-gradient-red rounded-full" style={{ width: `${(e.leads / max) * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-sm font-medium mb-3">Leads internacionais</p>
            {paisesInternacionais.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum lead internacional no período/filtro</p>
            ) : (
              <div className="space-y-2">
                {paisesInternacionais.map(([nome, leads]) => (
                  <div key={nome} className="flex justify-between text-sm">
                    <span>{nome}</span>
                    <span className="text-gold font-medium">{leads}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

      </div>


      {/* Inteligência regional por funil — V6 */}
      <GlassCard className="p-5 sm:p-6 cs-geo-matriz-light-v18">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Inteligência comercial por região
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Distribuição dos leads brasileiros por região e funil
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Selecione uma região na primeira coluna para destacá-la no mapa.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Clique no nome de um funil para filtrar toda a Geografia.
              Clique novamente para mostrar todos.
            </p>
          </div>
          <div className="text-right">
            <div
              className="inline-flex items-center gap-1 rounded-lg
                border border-border/70 bg-background/30 p-1 mb-3"
              role="group"
              aria-label="Modo de análise regional"
            >
              <button
                type="button"
                aria-pressed={modoMatrizRegional === "volume"}
                onClick={() => setModoMatrizRegional("volume")}
                className={`px-3 py-1.5 rounded-md text-[11px]
                  font-semibold transition-colors
                  ${modoMatrizRegional === "volume"
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                Volume
              </button>
              <button
                type="button"
                aria-pressed={modoMatrizRegional === "participacao"}
                onClick={() => setModoMatrizRegional("participacao")}
                className={`px-3 py-1.5 rounded-md text-[11px]
                  font-semibold transition-colors
                  ${modoMatrizRegional === "participacao"
                    ? "bg-muted text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"}`}
              >
                Participação
              </button>
            </div>
            {!todosSelecionados && (
              <button
                type="button"
                onClick={() => setFunisSel([])}
                className="mb-2 inline-flex items-center rounded-lg
                  border border-primary/30 bg-primary/10 px-3 py-1.5
                  text-[11px] font-semibold text-foreground
                  hover:bg-primary/15 transition-colors"
              >
                Limpar filtro de funil
              </button>
            )}
            <p className="text-[11px] text-muted-foreground">
              Leads no Brasil
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {totalBrasil.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <table
            data-cs-geo-v15-3="true"
            data-single-funnel={
              !todosSelecionados && funisMatriz.length === 1
                ? "true"
                : "false"
            }
            data-matrix-mode={modoMatrizRegional} className="w-full border-separate border-spacing-y-2"
            style={{
              minWidth: todosSelecionados
                ? 900
                : Math.max(520, 370 + funisMatriz.length * 145)
            }}>
            <thead>
              <tr className="text-[11px] text-muted-foreground">
                <th className="text-left font-medium px-3 pb-2 min-w-[145px]">
                  Região
                </th>
                <th className="text-right font-medium px-3 pb-2">
                  Total
                </th>
                <th className="text-right font-medium px-3 pb-2">
                  {todosSelecionados ? "% Brasil" : "% do filtro"}
                </th>
                {funisMatriz.map(f => (
                  <th
                    key={f}
                    className="text-center font-medium px-2 pb-2 min-w-[110px]"
                  >
                    {/* cs-geo-funil-matriz-v12 */}
                    <button
                      type="button"
                      title={`Filtrar a Geografia por ${f}`}
                      aria-label={`Filtrar pelo funil ${f}`}
                      aria-pressed={
                        funisSel.length === 1 &&
                        funisSel[0] === f
                      }
                      onClick={() => {
                        setFunisSel(prev =>
                          prev.length === 1 && prev[0] === f
                            ? []
                            : [f]
                        );
                      }}
                      className="cs-geo-funil-trigger"
                    >
                      {f}
                    </button>
                  </th>
                ))}
                {todosSelecionados && (
                  <th
                    className="text-center font-medium px-2 pb-2 min-w-[115px]"
                    title="Funis não exibidos, não mapeados ou não informados"
                  >
                    Outros / sem funil
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {matrizRegional.map(linha => (
                <tr
                  key={linha.nome}
                  className={
                    regiaoEmFoco === linha.nome
                      ? "cs-geo-row-focused"
                      : ""
                  }
                >
                  <td className="px-3 py-3 text-[13px] font-semibold text-foreground
                    rounded-l-xl bg-muted/20">
                    {linha.nome === "Não identificada" ? (
                      <span>{linha.nome}</span>
                    ) : (
                      <button
                        type="button"
                        title={`Destacar ${linha.nome} no mapa`}
                        aria-pressed={regiaoEmFoco === linha.nome}
                        onClick={() => {
                          setRegiaoEmFoco(
                            regiaoEmFoco === linha.nome
                              ? null
                              : linha.nome
                          );
                          setView("estados");
                          mapaFocoRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                          });
                        }}
                        className={`text-left underline-offset-4
                          hover:underline transition-colors
                          ${regiaoEmFoco === linha.nome
                            ? "text-primary"
                            : "text-foreground"}`}
                      >
                        {linha.nome}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums
                    text-[13px] font-semibold bg-muted/20">
                    {linha.total.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums
                    text-xs text-muted-foreground bg-muted/20">
                    {totalBrasil > 0
                      ? `${((linha.total / totalBrasil) * 100)
                          .toFixed(1).replace(".", ",")}%`
                      : "0,0%"}
                  </td>
                  {funisMatriz.map(f => {
                    const id = PIPELINE_IDS[f];
                    const qtd = id
                      ? (linha.porFunil[id] || 0)
                      : 0;
                    const maximo = id
                      ? (maximoRegionalPorFunil[id] || 1)
                      : 1;
                    const totalDoFunil = id
                      ? (totaisRegionaisPorFunil[id] || 0)
                      : 0;

                    const participacao = totalDoFunil > 0
                      ? (qtd / totalDoFunil) * 100
                      : 0;

                    const intensidade = modoMatrizRegional === "volume"
                      ? qtd / maximo
                      : participacao / 100;

                    const alpha = qtd > 0
                      ? 0.06 + 0.24 * intensidade
                      : 0;

                    return (
                      <td key={f} className="px-1.5 py-1.5">
                        <div
                          title={`${linha.nome} · ${f}: ${qtd.toLocaleString("pt-BR")} leads · ${participacao.toFixed(1).replace(".", ",")}% do funil no Brasil`}
                          className="min-h-[38px] rounded-lg border border-border/40
                            flex items-center justify-center text-[12px]
                            font-semibold tabular-nums text-foreground"
                          style={{
                            backgroundColor:
                              qtd > 0
                                ? `rgba(247,48,78,${alpha})`
                                : "transparent"
                          }}
                        >
                          {qtd > 0
                            ? modoMatrizRegional === "volume"
                              ? qtd.toLocaleString("pt-BR")
                              : `${participacao.toFixed(1).replace(".", ",")}%`
                            : "—"}
                        </div>
                      </td>
                    );
                  })}
                  {/* cs-geo-matriz-contextual-v13 */}
                  {todosSelecionados && (
                  <td className="px-1.5 py-1.5">
                    <div className="min-h-[38px] rounded-lg border
                      border-border/50 bg-muted/20 flex items-center
                      justify-center text-[12px] font-semibold
                      tabular-nums text-foreground">
                      {(() => {
                        const outros = Math.max(
                          0,
                          linha.total - funisMatriz.reduce(
                            (soma, f) =>
                              soma + (linha.porFunil[PIPELINE_IDS[f]] || 0),
                            0
                          )
                        );

                        if (modoMatrizRegional === "participacao") {
                          return totalOutrosRegional > 0
                            ? `${((outros / totalOutrosRegional) * 100)
                                .toFixed(1).replace(".", ",")}%`
                            : "—";
                        }

                        return outros.toLocaleString("pt-BR");
                      })()}
                    </div>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {matrizRegional.length === 0 && (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum lead brasileiro encontrado para os filtros atuais.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between
          gap-3 mt-3 pt-4 border-t border-border/50">
          
          <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
            <p>
              {modoMatrizRegional === "volume"
                ? "A intensidade das células representa o volume de leads em cada funil."
                : "Os percentuais mostram a participação de cada região no total brasileiro do respectivo funil."}
            </p>
            <p>
              {todosSelecionados
                ? "Outros / sem funil reúne registros de funis não exibidos, não mapeados ou sem identificação."
                : "A análise considera somente os funis selecionados."}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Distribuição de leads · Não representa taxa de conversão
          </p>
        </div>
      </GlassCard>
    </div>
  );
}

function useMapZoomPan() {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onWheel = (e: React.WheelEvent) => {
    // cs-geo-zoom-controlado-v20
    // Rolagem normal percorre o dashboard.
    // Ctrl ou Command habilita o zoom do mapa.
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({ ...t, scale: Math.min(8, Math.max(1, t.scale * delta)) }));
  };
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setTransform(t => ({ ...t, x: dragging.current!.origX + dx, y: dragging.current!.origY + dy }));
  };
  const onMouseUp = () => { dragging.current = null; };
  const reset = () => setTransform({ scale: 1, x: 0, y: 0 });

  return { transform, onWheel, onMouseDown, onMouseMove, onMouseUp, reset };
}

function ZoomHint({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      aria-label="Restaurar enquadramento do mapa"
      title="Restaurar enquadramento"
      onClick={onReset}
      className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-md bg-background/70 border border-border text-muted-foreground hover:text-foreground backdrop-blur"
    >
      Enquadrar mapa
    </button>
  );
}

// ============================================================
// Mapa mundial
// ============================================================
function WorldMap({ porPais, onClickBrasil, onHover }: { porPais: Record<string, number>; onClickBrasil: () => void; onHover: (i: any) => void }) {
  const [geo, setGeo] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, onWheel, onMouseDown, onMouseMove, onMouseUp, reset } = useMapZoomPan();

  useEffect(() => {
    fetch("/geo/world-countries.json")
      .then(r => r.json())
      .then(topo => {
        const key = Object.keys(topo.objects)[0];
        const fc = feature(topo, topo.objects[key]) as any;
        setGeo(fc.features);
      })
      .catch(() => setGeo([]));
  }, []);

  const width = 640, height = 360;
  const projection = d3.geoNaturalEarth1().scale(105).translate([width / 2, height / 2 + 20]);
  const path = d3.geoPath(projection as any);

  const nomeParaPtbr = useMemo(() => {
    const inv: Record<string, string> = {};
    Object.entries(NOME_PAIS_MAPA).forEach(([pt, en]) => { inv[en] = pt; });
    return inv;
  }, []);

  if (!geo) return <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Carregando mapa...</div>;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
          {geo.map((d: any, i: number) => {
            const nomeEn = d.properties.name;
            const nomePt = nomeParaPtbr[nomeEn];
            const leads = nomePt ? porPais[nomePt] : undefined;
            const isBrasil = nomeEn === "Brazil";
            const fill = leads ? (isBrasil ? "hsl(var(--primary))" : "hsl(var(--gold))") : "hsl(var(--muted) / 0.4)";
            return (
              <path
                key={i}
                d={path(d) || ""}
                fill={fill}
                stroke="hsl(var(--border))"
                strokeWidth={0.4 / transform.scale}
                className={leads ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                onMouseMove={(e) => {
                  if (!leads) return;
                  const rect = svgRef.current?.getBoundingClientRect();
                  onHover({ nome: nomePt, leads, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                }}
                onMouseLeave={() => onHover(null)}
                onClick={() => { if (isBrasil) onClickBrasil(); }}
              />
            );
          })}
        </g>
      </svg>
      <ZoomHint onReset={reset} />
      <p className="text-[11px] text-muted-foreground mt-2">Clique no Brasil para detalhar por estado. Use Ctrl + rolagem para zoom ou arraste para mover.</p>
    </div>
  );
}

// ============================================================
// Mapa do Brasil por estado
// ============================================================
function BrazilMap({
  porEstado,
  onClickEstado,
  onHover,
  regiaoEmFoco,
}: {
  porEstado: Record<string, { leads: number; uf: string }>;
  onClickEstado: (nome: string) => void;
  onHover: (i: any) => void;
  regiaoEmFoco: string | null;
}) {
  const [geo, setGeo] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, onWheel, onMouseDown, onMouseMove, onMouseUp, reset } = useMapZoomPan();

  useEffect(() => {
    fetch("/geo/br-states.json")
      .then(r => r.json())
      .then(fc => setGeo(fc.features))
      .catch(() => setGeo([]));
  }, []);

  const width = 640, height = 500;

  const projection = useMemo(() => {
    if (!geo || geo.length === 0) return null;
    return d3.geoMercator().fitSize([width, height], { type: "FeatureCollection", features: geo } as any);
  }, [geo]);

  const path = projection ? d3.geoPath(projection as any) : null;
  const max = Math.max(1, ...Object.values(porEstado).map(v => v.leads));

  if (!geo || !path) return <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Carregando estados...</div>;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="cs-geo-brasil-svg w-full h-auto cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
          {geo.map((d: any, i: number) => {
            const nome = d.properties.name;
            const info = porEstado[nome];
            const leads = info?.leads || 0;
            const regiaoDoEstado =
              REGIAO_ESTADO[textoGeoNormalizado(nome)];
            const estadoEmDestaque =
              !regiaoEmFoco || regiaoDoEstado === regiaoEmFoco;
            // cs-geo-escala-v4
            // Escala contínua adaptativa de concentração.
            // Preserva o valor real dos leads e amplia
            // o contraste entre os diferentes volumes.
            const ratio = leads / max;
            const intensity = leads > 0
              ? 0.24 + 0.72 * Math.pow(ratio, 0.8)
              : 0;
            return (
              <path
                key={i}
                d={path(d) || ""}
                fill={leads > 0 ? `hsl(var(--cs-geo-concentracao) / ${intensity})` : "hsl(var(--cs-geo-sem-dados) / 0.65)"}
                stroke="hsl(var(--cs-geo-contorno))"
                strokeWidth={
                  (regiaoEmFoco && estadoEmDestaque ? 1.35 : 0.85)
                  / transform.scale
                }
                opacity={estadoEmDestaque ? 1 : 0.22}
                className={leads > 0 ? "cursor-pointer transition-[filter,opacity] duration-150 hover:brightness-125" : ""}
                onMouseMove={(e) => {
                  if (!leads) return;
                  const rect = svgRef.current?.getBoundingClientRect();
                  onHover({ nome, leads, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                }}
                onMouseLeave={() => onHover(null)}
                onClick={() => { if (leads > 0) onClickEstado(nome); }}
              />
            );
          })}
        </g>
      </svg>
      <ZoomHint onReset={reset} />
      {/* cs-geo-brasil-glass-v2 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Selecione um estado para consultar os detalhes disponíveis. Use Ctrl + rolagem para zoom ou arraste para mover.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Menor</span>
          <span
            aria-hidden="true"
            className="cs-geo-escala-cor h-[7px] w-24 rounded-full"
          />
          <span>Maior concentração</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Lista de cidades (drill-down)
// ============================================================
function CidadesList({ cidades }: { cidades: { nome: string; leads: number }[] }) {
  if (cidades.length === 0) {
    return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Não há cidades identificadas nos dados disponíveis para este estado</div>;
  }
  const max = cidades[0]?.leads || 1;
  return (
    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2">
      {cidades.map(c => (
        <div key={c.nome}>
          <div className="flex justify-between text-sm mb-1">
            <span className={c.nome === "Cidade não informada" ? "text-muted-foreground italic" : ""}>{c.nome}</span>
            <span className="text-muted-foreground">{c.leads}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full bg-gradient-red rounded-full" style={{ width: `${(c.leads / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
