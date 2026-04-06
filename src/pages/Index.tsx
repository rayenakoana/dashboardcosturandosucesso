import { useMemo, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { GlassCard } from "@/components/GlassCard";
import { useVendas } from "@/hooks/useVendas";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { usePerformanceReunioes } from "@/hooks/usePerformanceReunioes";
import { useMetricasDiarias } from "@/hooks/useMetricasDiarias";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, Target, TrendingUp, Clock, BadgeDollarSign,
  Users, BarChart3, PieChart as PieChartIcon, AlertTriangle, CalendarCheck, Percent,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
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

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3" style={{ height }}>
      <div className="flex items-end gap-2 h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function Index() {
  const { data: vendas = [], isLoading: loadingVendas } = useVendas();
  const { data: custos = [], isLoading: loadingCustos } = useCustosMarketing();
  const { data: reunioes = [], isLoading: loadingReunioes } = usePerformanceReunioes();
  const { data: metricasDiarias = [], isLoading: loadingMetricas } = useMetricasDiarias();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { data: produtos = [] } = useConfiguracoes("Produto");
  const { data: campanhas = [] } = useConfiguracoes("Campanha");
  const { data: origens = [] } = useConfiguracoes("Origem");

  const isLoading = loadingVendas || loadingCustos || loadingReunioes || loadingMetricas;

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterFunil, setFilterFunil] = useState("Todos");
  const [filterProduto, setFilterProduto] = useState("Todos");
  const [filterCampanha, setFilterCampanha] = useState("Todos");
  const [filterOrigem, setFilterOrigem] = useState("Todos");

  const { start, end } = getDateRange(period, customStart, customEnd);

  // Vendas filtradas por data_entrada (visão de Safra / Marketing)
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

  // Vendas filtradas por data_fechamento (visão Financeira / Faturamento)
  const vendasFechamentoNoPeriodo = useMemo(() => {
    return vendas.filter(v => {
      if (!v.data_fechamento) return false;
      if (v.data_fechamento < start || v.data_fechamento > end) return false;
      if (v.status !== "Fechado") return false;
      if (filterFunil !== "Todos" && v.funil !== filterFunil) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, start, end, filterFunil, filterProduto, filterCampanha, filterOrigem]);

  const filteredCustos = useMemo(() => custos.filter(c => c.data >= start && c.data <= end), [custos, start, end]);
  const filteredReunioes = useMemo(() => reunioes.filter(r => r.data >= start && r.data <= end), [reunioes, start, end]);

  const filteredMetricas = useMemo(() => {
    return metricasDiarias.filter(m => {
      if (m.data < start || m.data > end) return false;
      if (filterFunil !== "Todos" && m.funil !== filterFunil) return false;
      return true;
    });
  }, [metricasDiarias, start, end, filterFunil]);

  // === KPIs Financeiros (por data_fechamento) ===
  const faturamento = vendasFechamentoNoPeriodo.reduce((s, v) => s + Number(v.valor), 0);
  const faturamentoRenovacao = vendasFechamentoNoPeriodo.filter(v => v.is_renovacao).reduce((s, v) => s + Number(v.valor), 0);
  const ticketMedio = vendasFechamentoNoPeriodo.length > 0 ? faturamento / vendasFechamentoNoPeriodo.length : 0;

  const tempoMedio = useMemo(() => {
    const with2dates = vendasFechamentoNoPeriodo.filter(v => v.data_entrada && v.data_fechamento);
    if (with2dates.length === 0) return 0;
    const total = with2dates.reduce((s, v) => {
      const d1 = new Date(v.data_entrada).getTime();
      const d2 = new Date(v.data_fechamento!).getTime();
      return s + Math.max(0, (d2 - d1) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(total / with2dates.length);
  }, [vendasFechamentoNoPeriodo]);

  // === KPIs de Marketing (por data_entrada / Safra) ===
  const fechadasSafra = filteredVendas.filter(v => v.status === "Fechado" && v.data_fechamento);

  const totalCustos = filteredCustos.reduce((s, c) => s + Number(c.valor), 0);
  const custosAds = filteredCustos.filter(c => c.categoria === "Ads").reduce((s, c) => s + Number(c.valor), 0);
  const totalLeads = filteredVendas.length;
  const cac = fechadasSafra.length > 0 ? totalCustos / fechadasSafra.length : 0;
  const cpl = totalLeads > 0 ? custosAds / totalLeads : 0;
  const roi = totalCustos > 0 ? ((faturamento - totalCustos) / totalCustos * 100) : 0;

  const totalConfirmado = filteredReunioes.reduce((s, r) => s + r.sdr_confirmado, 0);
  const totalReal = filteredReunioes.reduce((s, r) => s + r.compareceram_real, 0);
  const showUpRate = totalConfirmado > 0 ? (totalReal / totalConfirmado) * 100 : 0;

  // === KPIs from metricas_diarias ===
  const totalLeadsDiarios = filteredMetricas.reduce((s, m) => s + m.leads_recebidos, 0);
  const totalMQLDiarios = filteredMetricas.reduce((s, m) => s + m.leads_qualificados, 0);
  const totalAgendadas = filteredMetricas.reduce((s, m) => s + m.reunioes_agendadas, 0);
  const totalCompareceramDiarios = filteredMetricas.reduce((s, m) => s + m.compareceram_real, 0);
  const pctAgendamento = totalMQLDiarios > 0 ? (totalAgendadas / totalMQLDiarios) * 100 : 0;
  const pctShowUpDiario = totalAgendadas > 0 ? (totalCompareceramDiarios / totalAgendadas) * 100 : 0;
  const pctLeadVenda = totalLeadsDiarios > 0 ? (fechadasSafra.length / totalLeadsDiarios) * 100 : 0;

  // === Insights ===
  const allTimeLeads = vendas.length;
  const allTimeAds = custos.filter(c => c.categoria === "Ads").reduce((s, c) => s + Number(c.valor), 0);
  const cplHistorico = allTimeLeads > 0 ? allTimeAds / allTimeLeads : 0;

  const insights = useMemo(() => {
    const alerts: { msg: string; severity: "warning" | "destructive" }[] = [];
    const mqlCount = filteredVendas.filter(v => ["MQL", "Reunião", "Fechado"].includes(v.status)).length;
    const reuniaoCount = filteredVendas.filter(v => ["Reunião", "Fechado"].includes(v.status)).length;

    if (totalLeads > 0) {
      const convLeadMql = (mqlCount / totalLeads) * 100;
      if (convLeadMql < 35) alerts.push({ msg: `⚠️ Gargalo na Qualificação: Conversão Lead > Negociação em ${convLeadMql.toFixed(0)}% (meta: 35%)`, severity: "warning" });
    }
    if (mqlCount > 0) {
      const convMqlReuniao = (reuniaoCount / mqlCount) * 100;
      if (convMqlReuniao < 70) alerts.push({ msg: `⚠️ Gargalo na Proposta: Conversão Negociação > Proposta em ${convMqlReuniao.toFixed(0)}% (meta: 70%)`, severity: "warning" });
    }
    if (reuniaoCount > 0) {
      const convReunFech = (fechadasSafra.length / reuniaoCount) * 100;
      if (convReunFech < 30) alerts.push({ msg: `⚠️ Gargalo no Fechamento: Conversão Proposta > Venda em ${convReunFech.toFixed(0)}% (meta: 30%)`, severity: "warning" });
    }
    if (totalConfirmado > 0 && showUpRate < 70) {
      alerts.push({ msg: `⚠️ Atenção: Taxa de comparecimento em reuniões em ${showUpRate.toFixed(0)}% (meta: 70%)`, severity: "warning" });
    }
    if (cplHistorico > 0 && cpl > cplHistorico * 1.2) {
      alerts.push({ msg: `⚠️ Custo de Lead Elevado: CPL atual R$ ${cpl.toFixed(0)} está ${(((cpl - cplHistorico) / cplHistorico) * 100).toFixed(0)}% acima da média histórica (R$ ${cplHistorico.toFixed(0)})`, severity: "destructive" });
    }
    return alerts;
  }, [filteredVendas, fechadasSafra, totalLeads, totalConfirmado, showUpRate, cpl, cplHistorico]);

  // === Chart data ===
  const funnelData = useMemo(() => {
    const leadCount = filteredVendas.length;
    const mqlCount = filteredVendas.filter(v => ["MQL", "Reunião", "Fechado"].includes(v.status)).length;
    const reuniaoCount = filteredVendas.filter(v => ["Reunião", "Fechado"].includes(v.status)).length;
    const fechadoCount = fechadasSafra.length;
    return [
      { name: "Leads", value: leadCount, fill: "#C8102E" },
      { name: "MQL", value: mqlCount, fill: "#E8384F" },
      { name: "Reunião", value: reuniaoCount, fill: "#FF6B6B" },
      { name: "Fechado", value: fechadoCount, fill: "#FF8E8E" },
    ];
  }, [filteredVendas, fechadasSafra]);

  const segmentoData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => { const seg = v.segmento || "Sem segmento"; map[seg] = (map[seg] || 0) + Number(v.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFechamentoNoPeriodo]);

  const produtoData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => { const p = v.produto || "Sem produto"; map[p] = (map[p] || 0) + Number(v.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFechamentoNoPeriodo]);

  // === Gráfico de Faturamento por Dia (data_fechamento) ===
  const receitaDiariaData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => {
      const d = v.data_fechamento!;
      map[d] = (map[d] || 0) + Number(v.valor);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valor]) => ({ data, valor }));
  }, [vendasFechamentoNoPeriodo]);

  const motivosData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredVendas.filter(v => v.status === "Perdido").forEach(v => { const m = v.motivo_perda || "Não informado"; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredVendas]);

  const showUpData = useMemo(() => {
    return filteredReunioes.slice(0, 12).reverse().map(r => ({
      data: r.data,
      Confirmado: r.sdr_confirmado,
      Real: r.compareceram_real,
    }));
  }, [filteredReunioes]);

  // === Daily performance pivot table ===
  const funilNames = useMemo(() => {
    const names = new Set(filteredMetricas.map(m => m.funil));
    return Array.from(names).sort();
  }, [filteredMetricas]);

  const dailyTableData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    filteredMetricas.forEach(m => {
      if (!dateMap[m.data]) dateMap[m.data] = {};
      dateMap[m.data][m.funil] = (dateMap[m.data][m.funil] || 0) + m.leads_recebidos;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([data, funis]) => {
        const total = Object.values(funis).reduce((s, v) => s + v, 0);
        return { data, ...funis, TOTAL: total };
      });
  }, [filteredMetricas]);

  // === Conversion line chart data ===
  const conversionLineData = useMemo(() => {
    const dateMap: Record<string, { mql: number; agendadas: number; compareceram: number }> = {};
    filteredMetricas.forEach(m => {
      if (!dateMap[m.data]) dateMap[m.data] = { mql: 0, agendadas: 0, compareceram: 0 };
      dateMap[m.data].mql += m.leads_qualificados;
      dateMap[m.data].agendadas += m.reunioes_agendadas;
      dateMap[m.data].compareceram += m.compareceram_real;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, vals]) => ({ data, "Leads Qualificados": vals.mql, "Reuniões Agendadas": vals.agendadas, "Compareceram": vals.compareceram }));
  }, [filteredMetricas]);

  return (
    <div className="space-y-8">
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

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Insights de Performance
          </h2>
          {insights.map((alert, i) => (
            <div key={i} className={`rounded-lg border p-4 text-sm ${alert.severity === "destructive" ? "border-destructive/40 bg-destructive/10 text-foreground" : "border-primary/30 bg-primary/5 text-foreground"}`}>
              {alert.msg}
            </div>
          ))}
        </div>
      )}

      {/* Conversion KPIs from metricas_diarias */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <Percent className="h-3.5 w-3.5" /> KPIs de Conversão (Input Diário)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />) : (
            <>
              <KPICard title="% Agendamento" value={`${pctAgendamento.toFixed(1)}%`} icon={CalendarCheck}
                subtitle={`Meta: 50% | ${totalAgendadas}/${totalMQLDiarios}`}
                trend={pctAgendamento >= 50 ? "up" : pctAgendamento > 0 ? "down" : "neutral"} />
              <KPICard title="% Show-up" value={`${pctShowUpDiario.toFixed(1)}%`} icon={Users}
                subtitle={`Meta: 70% | ${totalCompareceramDiarios}/${totalAgendadas}`}
                trend={pctShowUpDiario >= 70 ? "up" : pctShowUpDiario > 0 ? "down" : "neutral"} />
              <KPICard title="Lead > Venda" value={`${pctLeadVenda.toFixed(1)}%`} icon={Target}
                subtitle={`${fechadasSafra.length} vendas / ${totalLeadsDiarios} leads`}
                trend={pctLeadVenda >= 10 ? "up" : pctLeadVenda > 0 ? "down" : "neutral"} />
              <KPICard title="Total Leads Diários" value={totalLeadsDiarios} icon={BarChart3}
                subtitle={`MQL: ${totalMQLDiarios}`} />
            </>
          )}
        </div>
      </div>

      {/* Commercial KPIs */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" /> Métricas Comerciais
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />) : (
            <>
              <KPICard title="Faturamento Total" value={`R$ ${faturamento.toLocaleString("pt-BR")}`} icon={DollarSign} subtitle={`${vendasFechamentoNoPeriodo.length} vendas fechadas no período`} />
              <KPICard title="Fat. Renovação" value={`R$ ${faturamentoRenovacao.toLocaleString("pt-BR")}`} icon={TrendingUp} subtitle="C$ CLUB" />
              <KPICard title="Ticket Médio" value={`R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={Target} />
              <KPICard title="Tempo Médio Fech." value={`${tempoMedio} dias`} icon={Clock} />
            </>
          )}
        </div>
      </div>

      {/* Revenue by Day Chart (data_fechamento) */}
      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" /> Faturamento por Dia (Data de Fechamento)
        </h3>
        {isLoading ? <ChartSkeleton /> : receitaDiariaData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={receitaDiariaData}>
              <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Bar dataKey="valor" fill="#C8102E" radius={[4, 4, 0, 0]} name="Faturamento" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem vendas fechadas no período</div>
        )}
      </GlassCard>
      {/* Marketing KPIs */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <BadgeDollarSign className="h-3.5 w-3.5" /> Eficiência de Marketing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />) : (
            <>
              <KPICard title="CAC" value={`R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={BadgeDollarSign} subtitle="Custo por Aquisição" />
              <KPICard title="CPL" value={`R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={Target} subtitle="Custo por Lead" />
              <KPICard title="ROI Real" value={`${roi.toFixed(1)}%`} icon={TrendingUp} trend={roi > 0 ? "up" : roi < 0 ? "down" : "neutral"} subtitle={roi > 0 ? "Positivo" : roi < 0 ? "Negativo" : "Neutro"} />
              <KPICard title="Show-up Rate" value={`${showUpRate.toFixed(1)}%`} icon={Users} subtitle={`${totalReal}/${totalConfirmado} reuniões`} />
            </>
          )}
        </div>
      </div>

      {/* Conversion Line Chart */}
      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" /> Ritmo do Funil — Conversão Diária
        </h3>
        {isLoading ? <ChartSkeleton /> : conversionLineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={conversionLineData}>
              <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Leads Qualificados" stroke="#C8102E" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Reuniões Agendadas" stroke="#FF6B6B" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Compareceram" stroke="#FFB4B4" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de input diário no período</div>
        )}
      </GlassCard>

      {/* Daily Performance Pivot Table */}
      <GlassCard className="p-0 overflow-hidden overflow-x-auto">
        <div className="p-4 pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CalendarCheck className="h-3.5 w-3.5" /> Performance Diária por Funil (Leads Recebidos)
          </h3>
        </div>
        {isLoading ? (
          <div className="p-4"><ChartSkeleton height={150} /></div>
        ) : dailyTableData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs">Data</TableHead>
                {funilNames.map(f => <TableHead key={f} className="text-xs text-right">{f}</TableHead>)}
                <TableHead className="text-xs text-right font-bold text-primary">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyTableData.map(row => (
                <TableRow key={row.data} className="border-border">
                  <TableCell className="text-sm font-medium">{row.data}</TableCell>
                  {funilNames.map(f => (
                    <TableCell key={f} className="text-right tabular-nums text-sm">{(row as any)[f] || 0}</TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums text-sm font-bold text-primary">{row.TOTAL}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-8 text-center text-muted-foreground text-sm">Sem dados de input diário no período</div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Funil de Conversão
          </h3>
          {isLoading ? <ChartSkeleton height={220} /> : funnelData[0]?.value > 0 ? (
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const pct = funnelData[0].value > 0 ? (stage.value / funnelData[0].value * 100) : 0;
                const loss = i > 0 ? funnelData[i - 1].value - stage.value : 0;
                const lossPct = i > 0 && funnelData[i - 1].value > 0 ? ((loss / funnelData[i - 1].value) * 100).toFixed(0) : null;
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{stage.value}</span>
                        {lossPct && <span className="text-[10px] text-red-400/70">-{lossPct}%</span>}
                      </div>
                    </div>
                    <div className="h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                      <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${pct}%`, background: stage.fill }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/80">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-3.5 w-3.5" /> Motivos de Perda
          </h3>
          {isLoading ? <ChartSkeleton /> : motivosData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={motivosData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: "hsl(0 0% 30%)" }}>
                  {motivosData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Nenhum lead perdido no período</div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Receita por Segmento</h3>
          {isLoading ? <ChartSkeleton /> : segmentoData.length > 0 ? (
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
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Receita por Produto</h3>
          {isLoading ? <ChartSkeleton /> : produtoData.length > 0 ? (
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

      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Show-up Rate — Confirmados vs. Compareceram
        </h3>
        {isLoading ? <ChartSkeleton /> : showUpData.length > 0 ? (
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
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de reuniões no período</div>
        )}
      </GlassCard>
    </div>
  );
}
