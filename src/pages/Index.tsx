import { useMemo, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { GlassCard } from "@/components/GlassCard";
import { useVendas } from "@/hooks/useVendas";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { usePerformanceReunioes } from "@/hooks/usePerformanceReunioes";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign, Target, TrendingUp, Clock, BadgeDollarSign,
  Users, BarChart3, PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from "recharts";

const COLORS = ["#C8102E", "#E8384F", "#FF6B6B", "#FF8E8E", "#FFB4B4", "#991B1B", "#FCA5A5"];

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "month", label: "Este Mês" },
  { value: "quarter", label: "Trimestre" },
  { value: "custom", label: "Personalizado" },
  { value: "all", label: "Tudo" },
];

function getDateRange(period: string, customStart: string, customEnd: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (period === "all") return { start: "2000-01-01", end: "2099-12-31" };
  if (period === "today") return { start: today, end: today };
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return { start, end: today };
  }
  if (period === "quarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qMonth, 1).toISOString().split("T")[0];
    return { start, end: today };
  }
  return { start: customStart || "2000-01-01", end: customEnd || "2099-12-31" };
}

const tooltipStyle = { background: "#111", border: "1px solid hsl(0 0% 12%)", borderRadius: "8px", fontSize: 12 };

export default function Index() {
  const { data: vendas = [] } = useVendas();
  const { data: custos = [] } = useCustosMarketing();
  const { data: reunioes = [] } = usePerformanceReunioes();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { data: produtos = [] } = useConfiguracoes("Produto");
  const { data: campanhas = [] } = useConfiguracoes("Campanha");
  const { data: origens = [] } = useConfiguracoes("Origem");

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterFunil, setFilterFunil] = useState("Todos");
  const [filterProduto, setFilterProduto] = useState("Todos");
  const [filterCampanha, setFilterCampanha] = useState("Todos");
  const [filterOrigem, setFilterOrigem] = useState("Todos");

  const { start, end } = getDateRange(period, customStart, customEnd);

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (v.data_entrada < start || v.data_entrada > end) return false;
      if (filterFunil !== "Todos" && v.funil !== filterFunil) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, start, end, filterFunil, filterProduto, filterCampanha, filterOrigem]);

  const filteredCustos = useMemo(() => {
    return custos.filter(c => c.data >= start && c.data <= end);
  }, [custos, start, end]);

  const filteredReunioes = useMemo(() => {
    return reunioes.filter(r => r.data >= start && r.data <= end);
  }, [reunioes, start, end]);

  // KPIs Comercial
  const fechadas = filteredVendas.filter(v => v.status === "Fechado");
  const faturamento = fechadas.reduce((s, v) => s + Number(v.valor), 0);
  const faturamentoRenovacao = fechadas.filter(v => v.is_renovacao).reduce((s, v) => s + Number(v.valor), 0);
  const ticketMedio = fechadas.length > 0 ? faturamento / fechadas.length : 0;

  const tempoMedio = useMemo(() => {
    const with2dates = fechadas.filter(v => v.data_entrada && v.data_fechamento);
    if (with2dates.length === 0) return 0;
    const total = with2dates.reduce((s, v) => {
      const d1 = new Date(v.data_entrada).getTime();
      const d2 = new Date(v.data_fechamento!).getTime();
      return s + Math.max(0, (d2 - d1) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(total / with2dates.length);
  }, [fechadas]);

  // KPIs Marketing
  const totalCustos = filteredCustos.reduce((s, c) => s + Number(c.valor), 0);
  const custosAds = filteredCustos.filter(c => c.categoria === "Ads").reduce((s, c) => s + Number(c.valor), 0);
  const totalLeads = filteredVendas.length;
  const cac = fechadas.length > 0 ? totalCustos / fechadas.length : 0;
  const cpl = totalLeads > 0 ? custosAds / totalLeads : 0;
  const roi = totalCustos > 0 ? ((faturamento - totalCustos) / totalCustos * 100) : 0;

  // Funnel
  const funnelData = useMemo(() => {
    const stages = ["Lead", "MQL", "Reunião", "Fechado"];
    const counts = stages.map(s => filteredVendas.filter(v => {
      const idx = stages.indexOf(v.status);
      const currentIdx = stages.indexOf(s);
      // "Perdido" counts at whatever stage they were lost, but for funnel we count cumulative
      return idx >= currentIdx || (v.status === "Perdido" && currentIdx <= stages.indexOf("Lead"));
    }).length);
    // Simpler: count how many reached at least this stage
    const leadCount = filteredVendas.length;
    const mqlCount = filteredVendas.filter(v => ["MQL", "Reunião", "Fechado"].includes(v.status)).length;
    const reuniaoCount = filteredVendas.filter(v => ["Reunião", "Fechado"].includes(v.status)).length;
    const fechadoCount = fechadas.length;

    return [
      { name: "Leads", value: leadCount, fill: "#C8102E" },
      { name: "MQL", value: mqlCount, fill: "#E8384F" },
      { name: "Reunião", value: reuniaoCount, fill: "#FF6B6B" },
      { name: "Fechado", value: fechadoCount, fill: "#FF8E8E" },
    ];
  }, [filteredVendas, fechadas]);

  // Segment revenue
  const segmentoData = useMemo(() => {
    const map: Record<string, number> = {};
    fechadas.forEach(v => {
      const seg = v.segmento || "Sem segmento";
      map[seg] = (map[seg] || 0) + Number(v.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fechadas]);

  // Product revenue
  const produtoData = useMemo(() => {
    const map: Record<string, number> = {};
    fechadas.forEach(v => {
      const p = v.produto || "Sem produto";
      map[p] = (map[p] || 0) + Number(v.valor);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [fechadas]);

  // Loss reasons
  const motivosData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVendas.filter(v => v.status === "Perdido").forEach(v => {
      const m = v.motivo_perda || "Não informado";
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredVendas]);

  // Show-up rate chart
  const showUpData = useMemo(() => {
    return filteredReunioes.slice(0, 12).reverse().map(r => ({
      data: r.data,
      Confirmado: r.sdr_confirmado,
      Real: r.compareceram_real,
    }));
  }, [filteredReunioes]);

  const totalConfirmado = filteredReunioes.reduce((s, r) => s + r.sdr_confirmado, 0);
  const totalReal = filteredReunioes.reduce((s, r) => s + r.compareceram_real, 0);
  const showUpRate = totalConfirmado > 0 ? ((totalReal / totalConfirmado) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Geral</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão consolidada de Marketing & Comercial</p>
      </div>

      {/* Filters */}
      <GlassCard className="!py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="bg-muted/50 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {period === "custom" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">De</Label>
                <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-muted/50 h-9 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Até</Label>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-muted/50 h-9 text-xs" />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs text-muted-foreground">Funil</Label>
            <Select value={filterFunil} onValueChange={setFilterFunil}>
              <SelectTrigger className="bg-muted/50 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {funis.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <Select value={filterProduto} onValueChange={setFilterProduto}>
              <SelectTrigger className="bg-muted/50 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {produtos.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Campanha</Label>
            <Select value={filterCampanha} onValueChange={setFilterCampanha}>
              <SelectTrigger className="bg-muted/50 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {campanhas.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Origem</Label>
            <Select value={filterOrigem} onValueChange={setFilterOrigem}>
              <SelectTrigger className="bg-muted/50 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {origens.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* KPIs Comercial */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" /> Métricas Comerciais
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard title="Faturamento Total" value={`R$ ${faturamento.toLocaleString("pt-BR")}`} icon={DollarSign} />
          <KPICard title="Fat. Renovação" value={`R$ ${faturamentoRenovacao.toLocaleString("pt-BR")}`} icon={TrendingUp} subtitle="C$ CLUB" />
          <KPICard title="Ticket Médio" value={`R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={Target} />
          <KPICard title="Tempo Médio Fech." value={`${tempoMedio} dias`} icon={Clock} />
        </div>
      </div>

      {/* KPIs Marketing */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <BadgeDollarSign className="h-3.5 w-3.5" /> Eficiência de Marketing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard title="CAC" value={`R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={BadgeDollarSign} subtitle="Custo por Aquisição" />
          <KPICard title="CPL" value={`R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={Target} subtitle="Custo por Lead" />
          <KPICard
            title="ROI Real"
            value={`${roi.toFixed(1)}%`}
            icon={TrendingUp}
            trend={roi > 0 ? "up" : roi < 0 ? "down" : "neutral"}
            subtitle={roi > 0 ? "Positivo" : roi < 0 ? "Negativo" : "Neutro"}
          />
          <KPICard title="Show-up Rate" value={`${showUpRate}%`} icon={Users} subtitle={`${totalReal}/${totalConfirmado} reuniões`} />
        </div>
      </div>

      {/* Charts Row 1: Funnel + Motivos de Perda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funnel */}
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Funil de Conversão
          </h3>
          {funnelData[0]?.value > 0 ? (
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const pct = funnelData[0].value > 0 ? (stage.value / funnelData[0].value * 100) : 0;
                const loss = i > 0 ? funnelData[i - 1].value - stage.value : 0;
                const lossPct = i > 0 && funnelData[i - 1].value > 0
                  ? ((loss / funnelData[i - 1].value) * 100).toFixed(0) : null;
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{stage.value}</span>
                        {lossPct && (
                          <span className="text-[10px] text-red-400/70">-{lossPct}%</span>
                        )}
                      </div>
                    </div>
                    <div className="h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700"
                        style={{ width: `${pct}%`, background: stage.fill }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/80">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>

        {/* Motivos de Perda */}
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-3.5 w-3.5" /> Motivos de Perda
          </h3>
          {motivosData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={motivosData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "hsl(0 0% 30%)" }}
                >
                  {motivosData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhum lead perdido no período
            </div>
          )}
        </GlassCard>
      </div>

      {/* Charts Row 2: Segmento + Produto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Receita por Segmento
          </h3>
          {segmentoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, segmentoData.length * 40)}>
              <BarChart data={segmentoData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="#C8102E" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Receita por Produto
          </h3>
          {produtoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, produtoData.length * 40)}>
              <BarChart data={produtoData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="#E8384F" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>
      </div>

      {/* Chart Row 3: Show-up Rate */}
      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Show-up Rate — Confirmados vs. Compareceram
        </h3>
        {showUpData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={showUpData}>
              <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Confirmado" fill="#333" radius={[4, 4, 0, 0]} name="Confirmados SDR" />
              <Bar dataKey="Real" fill="#C8102E" radius={[4, 4, 0, 0]} name="Compareceram" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados de reuniões no período
          </div>
        )}
      </GlassCard>
    </div>
  );
}
