import { useState, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { KPICard } from "@/components/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailCampaigns, useEmailAutomations, EmailCampaign, EmailAutomation } from "@/hooks/useEmailMarketing";
import {
  Mail, Zap, TrendingUp, Users, MousePointerClick,
  BarChart2, ChevronDown, ChevronUp, X, ArrowUpDown,
  CheckCircle2, AlertCircle, Newspaper, ShoppingBag,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Constantes visuais ────────────────────────────────────────────────────────

const TT = {
  contentStyle: {
    background: "hsl(240 20% 11%)",
    border: "1px solid hsl(240 15% 14%)",
    borderRadius: 10, fontSize: 11,
    color: "hsl(0 0% 96%)",
    minWidth: 130, padding: "8px 12px",
  },
  labelStyle: { color: "hsl(0 0% 96%)", fontWeight: 600, marginBottom: 2 },
  itemStyle:  { color: "hsl(0 0% 80%)" },
  cursor:     { fill: "hsl(0 0% 100% / 0.03)" },
};

const P    = "hsl(355 82% 51%)";
const GOLD = "hsl(43 96% 56%)";
const MUTED = "hsl(0 0% 60%)";

const pct = (n: number) => n.toFixed(1) + "%";
const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n));

type EmailTab = "visao-geral" | "campanhas" | "automacoes";

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

function TypeBadge({ type }: { type: "news" | "commercial" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
      type === "news"
        ? "bg-blue-500/15 text-blue-400"
        : "bg-primary/15 text-primary"
    )}>
      {type === "news" ? <Newspaper className="h-2.5 w-2.5" /> : <ShoppingBag className="h-2.5 w-2.5" />}
      {type === "news" ? "News" : "Comercial"}
    </span>
  );
}

// ── Drawer de detalhe de campanha ─────────────────────────────────────────────

function CampaignDrawer({ campaign, onClose }: { campaign: EmailCampaign; onClose: () => void }) {
  const metrics = [
    { label: "Destinatários",    value: fmt(campaign.recipients),          icon: Users },
    { label: "Entregues",        value: fmt(campaign.delivered),           icon: CheckCircle2 },
    { label: "Taxa de entrega",  value: pct(campaign.delivery_rate),       icon: CheckCircle2 },
    { label: "Taxa de abertura", value: pct(campaign.open_rate),           icon: Mail },
    { label: "Taxa de clique",   value: pct(campaign.click_rate),          icon: MousePointerClick },
    { label: "Bounce",           value: pct(campaign.bounce_rate),         icon: AlertCircle },
    { label: "Spam",             value: pct(campaign.spam_rate),           icon: AlertCircle },
    { label: "Descadastros",     value: pct(campaign.unsubscribe_rate),    icon: AlertCircle },
  ];

  const barData = [
    { name: "Abertura",   value: campaign.open_rate },
    { name: "Clique",     value: campaign.click_rate },
    { name: "Bounce",     value: campaign.bounce_rate },
    { name: "Spam",       value: campaign.spam_rate },
    { name: "Unsub",      value: campaign.unsubscribe_rate },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border-l border-border h-full overflow-y-auto p-5 space-y-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <TypeBadge type={campaign.type} />
            <h2 className="text-sm font-bold mt-1.5 leading-snug">{campaign.name}</h2>
            {campaign.subject && (
              <p className="text-[11px] text-muted-foreground mt-0.5">"{campaign.subject}"</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
              {campaign.version !== "general" && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-gold/15 text-gold font-bold text-[9px]">
                  Versão {campaign.version}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass-card !p-3">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-base font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Gráfico de taxas */}
        <div>
          <SubTitle>Taxas (%)</SubTitle>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip {...TT} formatter={(v: number) => pct(v)} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? P : i === 1 ? GOLD : MUTED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Aba Visão Geral ───────────────────────────────────────────────────────────

function VisaoGeral({ campaigns, loading }: { campaigns: EmailCampaign[]; loading: boolean }) {
  const totals = useMemo(() => {
    const comercial = campaigns.filter(c => c.type === "commercial");
    const news      = campaigns.filter(c => c.type === "news");
    const avg = (arr: EmailCampaign[], key: keyof EmailCampaign) =>
      arr.length > 0 ? arr.reduce((s, c) => s + (Number(c[key]) || 0), 0) / arr.length : 0;

    return {
      total:          campaigns.length,
      totalComercial: comercial.length,
      totalNews:      news.length,
      avgOpen:        avg(campaigns, "open_rate"),
      avgClick:       avg(campaigns, "click_rate"),
      avgBounce:      avg(campaigns, "bounce_rate"),
      avgOpenC:       avg(comercial, "open_rate"),
      avgOpenN:       avg(news,      "open_rate"),
      avgClickC:      avg(comercial, "click_rate"),
      avgClickN:      avg(news,      "click_rate"),
      totalRecip:     campaigns.reduce((s, c) => s + (c.recipients || 0), 0),
    };
  }, [campaigns]);

  // Evolução mensal de abertura
  const monthlyData = useMemo(() => {
    const m: Record<string, { month: string; comercial: number[]; news: number[] }> = {};
    campaigns.forEach(c => {
      if (!c.sent_at) return;
      const key = c.sent_at.slice(0, 7);
      if (!m[key]) m[key] = { month: key, comercial: [], news: [] };
      if (c.type === "commercial") m[key].comercial.push(c.open_rate);
      else m[key].news.push(c.open_rate);
    });
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(({ month, comercial, news }) => ({
        month: month.slice(5) + "/" + month.slice(2, 4),
        "Comercial": comercial.length > 0 ? parseFloat((comercial.reduce((a, b) => a + b, 0) / comercial.length).toFixed(1)) : null,
        "News": news.length > 0 ? parseFloat((news.reduce((a, b) => a + b, 0) / news.length).toFixed(1)) : null,
      }));
  }, [campaigns]);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Campanhas no período" value={totals.total} subtitle={`${totals.totalComercial} comerciais · ${totals.totalNews} news`} icon={Mail} />
        <KPICard title="Média de abertura" value={pct(totals.avgOpen)} subtitle="Todas as campanhas" icon={TrendingUp} />
        <KPICard title="Média de clique" value={pct(totals.avgClick)} subtitle="Todas as campanhas" icon={MousePointerClick} />
        <KPICard title="Total de destinatários" value={fmt(totals.totalRecip)} subtitle="Soma do período" icon={Users} />
      </div>

      {/* Split comercial vs news */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GlassCard>
          <SubTitle>Comercial vs News — Abertura</SubTitle>
          <div className="flex items-end gap-6 mt-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Comercial</p>
              <p className="text-2xl font-bold text-primary">{pct(totals.avgOpenC)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">clique: {pct(totals.avgClickC)}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div>
              <p className="text-[10px] text-muted-foreground">News</p>
              <p className="text-2xl font-bold" style={{ color: GOLD }}>{pct(totals.avgOpenN)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">clique: {pct(totals.avgClickN)}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <SubTitle>Média de abertura por mês</SubTitle>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip {...TT} formatter={(v: number) => pct(v)} />
              <Line type="monotone" dataKey="Comercial" stroke={P}    strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="News"      stroke={GOLD} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Bounce + spam */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KPICard title="Bounce médio"       value={pct(totals.avgBounce)}  subtitle="Ideal < 2%" icon={AlertCircle} />
        <KPICard title="Campanhas c/ A/B"   value={campaigns.filter(c => c.version !== "general").length} subtitle="Testes detectados" icon={BarChart2} />
        <KPICard title="Campanhas News"     value={totals.totalNews}       subtitle={`${pct(totals.totalNews / (totals.total || 1) * 100)} do total`} icon={Newspaper} />
      </div>
    </div>
  );
}

// ── Aba Campanhas ─────────────────────────────────────────────────────────────

type SortKey = "sent_at" | "open_rate" | "click_rate" | "recipients" | "bounce_rate";

function Campanhas({ campaigns, loading }: { campaigns: EmailCampaign[]; loading: boolean }) {
  const [selected, setSelected] = useState<EmailCampaign | null>(null);
  const [filterType, setFilterType] = useState<"all" | "news" | "commercial">("all");
  const [sortKey, setSortKey] = useState<SortKey>("sent_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [compare, setCompare] = useState<EmailCampaign[]>([]);

  const sorted = useMemo(() => {
    const filtered = filterType === "all" ? campaigns : campaigns.filter(c => c.type === filterType);
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return sortDir === "desc"
        ? (av < bv ? 1 : -1)
        : (av > bv ? 1 : -1);
    });
  }, [campaigns, filterType, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
      {label}
      {sortKey === k
        ? sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  const toggleCompare = (c: EmailCampaign) => {
    setCompare(prev =>
      prev.find(x => x.id === c.id)
        ? prev.filter(x => x.id !== c.id)
        : prev.length < 2 ? [...prev, c] : prev
    );
  };

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "commercial", "news"] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
              filterType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}>
            {t === "all" ? "Todas" : t === "commercial" ? "Comercial" : "News"}
          </button>
        ))}
        <span className="text-[10px] text-muted-foreground ml-auto">{sorted.length} campanhas</span>
      </div>

      {/* Comparador */}
      {compare.length > 0 && (
        <GlassCard className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <SubTitle>Comparador A/B</SubTitle>
            <button onClick={() => setCompare([])} className="text-[10px] text-muted-foreground hover:text-foreground">Limpar</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {compare.map(c => (
              <div key={c.id}>
                <p className="text-[11px] font-semibold truncate mb-2">{c.name}</p>
                <div className="space-y-1">
                  {[
                    { label: "Abertura",  value: pct(c.open_rate) },
                    { label: "Clique",    value: pct(c.click_rate) },
                    { label: "Bounce",    value: pct(c.bounce_rate) },
                    { label: "Enviados",  value: fmt(c.recipients) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Tabela */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Campanha</th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="sent_at" label="Data" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="recipients" label="Envios" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="open_rate" label="Abertura" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="click_rate" label="Clique" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="bounce_rate" label="Bounce" /></th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => (
                <tr key={c.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => setSelected(c)}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <TypeBadge type={c.type} />
                      <span className="font-medium truncate max-w-[200px]">{c.name}</span>
                      {c.version !== "general" && (
                        <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-gold/15 text-gold">
                          {c.version}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 text-muted-foreground">
                    {c.sent_at ? new Date(c.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                  </td>
                  <td className="text-right px-3 py-2.5">{fmt(c.recipients)}</td>
                  <td className={cn("text-right px-3 py-2.5 font-semibold",
                    c.open_rate >= 30 ? "text-emerald-400" : c.open_rate >= 20 ? "text-gold" : "text-primary")}>
                    {pct(c.open_rate)}
                  </td>
                  <td className="text-right px-3 py-2.5">{pct(c.click_rate)}</td>
                  <td className={cn("text-right px-3 py-2.5",
                    c.bounce_rate > 2 ? "text-primary" : "text-muted-foreground")}>
                    {pct(c.bounce_rate)}
                  </td>
                  <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleCompare(c); }}>
                    <button className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold border transition-colors",
                      compare.find(x => x.id === c.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}>
                      {compare.find(x => x.id === c.id) ? "✓" : "+"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {selected && <CampaignDrawer campaign={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Aba Automações ────────────────────────────────────────────────────────────

function Automacoes({ automations, loading }: { automations: EmailAutomation[]; loading: boolean }) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return automations.filter(a => a.name.toLowerCase().includes(q));
  }, [automations, search]);

  const visible = showAll ? filtered : filtered.slice(0, 12);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Automações ativas" value={automations.filter(a => a.status === "active").length} icon={Zap} />
        <KPICard title="Total de leads"    value={fmt(automations.reduce((s, a) => s + a.leads_entered, 0))} icon={Users} />
        <KPICard title="Vendas geradas"    value={automations.reduce((s, a) => s + a.sales, 0)} icon={TrendingUp} />
        <KPICard title="Total de fluxos"   value={automations.length} icon={BarChart2} />
      </div>

      {/* Busca */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar automação..."
        className="w-full sm:w-72 text-xs px-3 py-2 rounded-lg border border-border bg-card/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
      />

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map(a => {
          const convRate = a.leads_entered > 0
            ? (a.sales / a.leads_entered * 100).toFixed(1)
            : "0.0";
          const funnelData = [
            { name: "Entradas", value: a.leads_entered },
            { name: "Ativos",   value: a.leads_active },
            { name: "Qualif.",  value: a.qualifications },
            { name: "Opport.",  value: a.opportunities },
            { name: "Vendas",   value: a.sales },
          ].filter(d => d.value > 0);

          return (
            <GlassCard key={a.id} className="!p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold leading-snug line-clamp-2">{a.name}</p>
                  <span className={cn(
                    "inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                    a.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted/40 text-muted-foreground"
                  )}>
                    {a.status === "active" ? "Ativa" : a.status}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">Conversão</p>
                  <p className="text-base font-bold text-primary">{convRate}%</p>
                </div>
              </div>

              {/* Mini funil em barras */}
              {funnelData.length > 1 && (
                <div className="space-y-1">
                  {funnelData.map((d, i) => {
                    const pctVal = funnelData[0].value > 0 ? d.value / funnelData[0].value : 0;
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="text-[9px] text-muted-foreground w-14 shrink-0">{d.name}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pctVal * 100}%`,
                              background: i === 0 ? MUTED : i === funnelData.length - 1 ? P : GOLD,
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-semibold w-8 text-right shrink-0">
                          {fmt(d.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Métricas rápidas */}
              <div className="flex gap-3 text-[10px] border-t border-border/50 pt-2">
                <div>
                  <p className="text-muted-foreground">Entradas</p>
                  <p className="font-semibold">{fmt(a.leads_entered)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ativos</p>
                  <p className="font-semibold">{fmt(a.leads_active)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendas</p>
                  <p className="font-semibold text-primary">{a.sales}</p>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filtered.length > 12 && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="w-full py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl transition-colors flex items-center justify-center gap-1"
        >
          {showAll ? <><ChevronUp className="h-3 w-3" /> Ver menos</> : <><ChevronDown className="h-3 w-3" /> Ver todas ({filtered.length})</>}
        </button>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props { from: string; to: string; }

export function EmailMarketingSection({ from, to }: Props) {
  const [tab, setTab] = useState<EmailTab>("visao-geral");

  const { data: campaigns = [], isLoading: loadingCampaigns } = useEmailCampaigns(from, to);
  const { data: automations = [], isLoading: loadingAutos }   = useEmailAutomations();

  const TABS = [
    { key: "visao-geral" as EmailTab,  label: "Visão geral",  Icon: TrendingUp },
    { key: "campanhas"   as EmailTab,  label: "Campanhas",    Icon: Mail       },
    { key: "automacoes"  as EmailTab,  label: "Automações",   Icon: Zap        },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-card/40 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-3 w-3" />{label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === "visao-geral" && <VisaoGeral campaigns={campaigns} loading={loadingCampaigns} />}
      {tab === "campanhas"   && <Campanhas  campaigns={campaigns} loading={loadingCampaigns} />}
      {tab === "automacoes"  && <Automacoes automations={automations} loading={loadingAutos} />}
    </div>
  );
}
