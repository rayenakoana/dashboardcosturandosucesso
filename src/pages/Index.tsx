import { KPICard } from "@/components/KPICard";
import { GlassCard } from "@/components/GlassCard";
import { useVendas } from "@/hooks/useVendas";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { usePerformanceReunioes } from "@/hooks/usePerformanceReunioes";
import { BarChart3, DollarSign, Target, TrendingUp, Users, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#C8102E", "#E8384F", "#FF6B6B", "#FF8E8E", "#FFB4B4"];

export default function Index() {
  const { data: vendas = [] } = useVendas();
  const { data: custos = [] } = useCustosMarketing();
  const { data: reunioes = [] } = usePerformanceReunioes();

  const totalVendas = vendas.filter(v => v.status === "Fechado").reduce((s, v) => s + Number(v.valor), 0);
  const totalLeads = vendas.length;
  const totalCustos = custos.reduce((s, c) => s + Number(c.valor), 0);
  const taxaConversao = totalLeads > 0
    ? ((vendas.filter(v => v.status === "Fechado").length / totalLeads) * 100).toFixed(1)
    : "0";

  // Status distribution for pie chart
  const statusCount: Record<string, number> = {};
  vendas.forEach(v => { statusCount[v.status] = (statusCount[v.status] || 0) + 1; });
  const pieData = Object.entries(statusCount).map(([name, value]) => ({ name, value }));

  // Reuniões chart data
  const reunioesChart = reunioes.slice(0, 10).reverse().map(r => ({
    data: r.data,
    Estimado: r.sdr_estimado,
    Confirmado: r.sdr_confirmado,
    Real: r.compareceram_real,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral de Marketing & Comercial</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Receita Fechada" value={`R$ ${totalVendas.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <KPICard title="Total Leads" value={totalLeads} icon={Target} />
        <KPICard title="Taxa Conversão" value={`${taxaConversao}%`} icon={TrendingUp} />
        <KPICard title="Custo Marketing" value={`R$ ${totalCustos.toLocaleString("pt-BR")}`} icon={ShoppingCart} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Distribuição por Status
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de vendas ainda
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Performance Reuniões
          </h3>
          {reunioesChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reunioesChart}>
                <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
                <YAxis tick={{ fill: "#666", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: "8px" }} />
                <Bar dataKey="Estimado" fill="#333" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Confirmado" fill="#C8102E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Real" fill="#E8384F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados de reuniões ainda
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
