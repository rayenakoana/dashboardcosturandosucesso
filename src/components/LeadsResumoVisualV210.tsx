import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FUNIL_CORES } from "@/lib/funis";
import { useFunisVisiveis } from "@/hooks/useConfiguracoes";

type Linha = { data?: string | null; funil?: string | null; total_leads?: number | null };
type Props = {
  dados: Linha[];
  funisSelecionados: string[];
  inicio: string;
  fim: string;
  carregando: boolean;
};

// Exibe somente os dados que ja foram consultados pela Visao Geral.
export function LeadsResumoVisualV210({ dados, inicio, fim, carregando }: Props) {
  const { funisVisiveis } = useFunisVisiveis();

  // cs-v210-funil-match-fix-v1
  // Os registros ja chegam filtrados pela Visao Geral.
  // A configuracao de funis nao pode eliminar registros da soma.
  const normalizar = (valor: string) =>
    valor.trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

  const porDia: Record<string, number> = {};
  const porFunil: Record<string, number> = {};
  const rotulos: Record<string, string> = {};

  dados.forEach((row) => {
    const quantidade = Number(row.total_leads) || 0;
    const nome = String(row.funil ?? "").trim() || "Funil não informado";
    const chave = normalizar(nome);

    porFunil[chave] = (porFunil[chave] ?? 0) + quantidade;
    rotulos[chave] = rotulos[chave] ?? nome;

    if (row.data) {
      const dia = String(row.data).slice(0, 10);
      porDia[dia] = (porDia[dia] ?? 0) + quantidade;
    }
  });

  const serie = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, leads]) => ({
      dia: data.slice(5),
      leads,
    }));

  const distribuicao = Object.entries(porFunil)
    .map(([chave, leads]) => {
      const configurado = funisVisiveis.find(
        (nome) => normalizar(nome) === chave
      );
      const nome = configurado ?? rotulos[chave];

      return {
        nome,
        leads,
        cor: FUNIL_CORES[nome] ??
          FUNIL_CORES[rotulos[chave]] ??
          "#8892A5",
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const total = distribuicao.reduce(
    (s, item) => s + item.leads,
    0
  );

  return (
    <div className="cs-v210-visual" aria-label="Resumo grafico da chegada de leads">
      <div className="cs-v210-topline">
        <div>
          <span>CHEGADA DE LEADS</span>
          <p>Comportamento diário e participação por funil</p>
        </div>
        <div className="cs-v210-total">
          <strong>{carregando ? "—" : total.toLocaleString("pt-BR")}</strong>
          <div><span>LEADS NO PERÍODO</span><small>{inicio} — {fim}</small></div>
        </div>
      </div>

      {carregando ? (
        <div className="cs-v210-empty">Consultando indicadores...</div>
      ) : total <= 0 ? (
        <div className="cs-v210-empty">Nenhum lead encontrado para os filtros selecionados.</div>
      ) : (
        <div className="cs-v210-columns">
          <div className="cs-v210-chart">
            <h3>Evolução diária <span>{serie.length} dias com registros</span></h3>
            <div className="cs-v210-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serie} margin={{ top: 12, right: 10, bottom: 0, left: -26 }}>
                  <defs>
                    <linearGradient id="gradV210" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F7304E" stopOpacity={0.30} />
                      <stop offset="100%" stopColor="#F7304E" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(150,160,180,.13)" strokeDasharray="3 4" />
                  <XAxis dataKey="dia" tick={{ fill: "#8B96AA", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: "#8B96AA", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#202630", border: "1px solid #454D59", borderRadius: 8, color: "white" }} formatter={(v: number) => [v.toLocaleString("pt-BR"), "Leads"]} />
                  <Area dataKey="leads" type="monotone" stroke="#F7304E" strokeWidth={2.5} fill="url(#gradV210)" activeDot={{ r: 4 }} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="cs-v210-mix-col">
            <h3>Distribuição por funil <span>% dos leads</span></h3>
            <div className="cs-v210-mix-bar" role="img" aria-label="Participação proporcional de cada funil">
              {distribuicao.filter((item) => item.leads > 0).map((item) => (
                <div key={item.nome} title={`${item.nome}: ${item.leads}`} style={{ width: `${item.leads / total * 100}%`, background: item.cor }} />
              ))}
            </div>
            {distribuicao.map((item) => (
              <div key={item.nome} className="cs-v210-mix-row">
                <i style={{ background: item.cor }} />
                <span title={item.nome}>{item.nome}</span>
                <strong>{item.leads.toLocaleString("pt-BR")}</strong>
                <small>{(item.leads / total * 100).toFixed(1).replace(".", ",")}%</small>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
