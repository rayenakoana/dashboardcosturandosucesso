import { useState } from "react";
import { Instagram, ChevronDown, ExternalLink, Users, Heart, Share2, Eye, BookmarkIcon, TrendingUp } from "lucide-react";
import { useInstagramPostInsights, useInstagramAccountDaily } from "@/hooks/useInstagramInsights";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from "recharts";

type Period = "7d" | "15d" | "30d" | "90d" | "custom";

const PERIODS = [
  { label: "Últimos 7 dias",  value: "7d"  as Period },
  { label: "Últimos 15 dias", value: "15d" as Period },
  { label: "Últimos 30 dias", value: "30d" as Period },
  { label: "Últimos 90 dias", value: "90d" as Period },
  { label: "Personalizado",   value: "custom" as Period },
];

function getRange(period: Period, customStart: string, customEnd: string) {
  const today = new Date().toISOString().split("T")[0];
  const sub = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split("T")[0]; };
  if (period === "7d")  return { start: sub(6),  end: today };
  if (period === "15d") return { start: sub(14), end: today };
  if (period === "30d") return { start: sub(29), end: today };
  if (period === "90d") return { start: sub(89), end: today };
  return { start: customStart || sub(29), end: customEnd || today };
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function weekLabel(dateStr: string) {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().split("T")[0];
}

const ACCOUNT_COLORS: Record<string, string> = {
  eduardocristianoriginal: "#e11d48",
  costurandosucesso: "#0ea5e9",
};

const ACCOUNT_LABELS: Record<string, string> = {
  eduardocristianoriginal: "@eduardocristianoriginal",
  costurandosucesso: "@costurandosucesso",
};

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: 12,
};

function KPICard({ label, value, sub, icon: Icon, color = "text-primary", accent = false }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string; accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-1.5",
      accent && "border-primary/20 bg-primary/5"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </div>
      <span className="text-2xl font-bold text-foreground leading-none">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export default function InstagramDashboard() {
  const [period, setPeriod]           = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [dropOpen, setDropOpen]       = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  const { start, end } = getRange(period, customStart, customEnd);

  const { data: dailyData = [], isLoading: loadingDaily } = useInstagramAccountDaily(start, end);
  const { data: postsData = [], isLoading: loadingPosts } = useInstagramPostInsights(start, end);

  const accounts = [...new Set(dailyData.map(d => d.username))];

  const dailyByDate: Record<string, Record<string, number>> = {};
  dailyData.forEach(d => {
    if (!dailyByDate[d.date]) dailyByDate[d.date] = {};
    dailyByDate[d.date][d.username] = d.followers_count;
  });
  const followersChartData = Object.entries(dailyByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));

  const lastFollowers: Record<string, number> = {};
  const firstFollowers: Record<string, number> = {};
  dailyData.forEach(d => {
    lastFollowers[d.username] = d.followers_count;
    if (!firstFollowers[d.username]) firstFollowers[d.username] = d.followers_count;
  });

  const filteredPosts = activeAccount ? postsData.filter(p => p.username === activeAccount) : postsData;

  const topPosts = [...filteredPosts]
    .map(p => ({ ...p, engagement: p.like_count + p.comments_count + p.shares + p.saved }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 10);

  const igEngTotal   = filteredPosts.reduce((s, p) => s + p.like_count + p.comments_count + p.shares + p.saved, 0);
  const igAlcance    = filteredPosts.reduce((s, p) => s + p.reach, 0);
  const igViews      = filteredPosts.reduce((s, p) => s + (p.views || 0), 0);
  const igEngPorPost = filteredPosts.length > 0 ? Math.round(igEngTotal / filteredPosts.length) : 0;

  const porTipo: Record<string, { posts: number; engagement: number; reach: number }> = {};
  filteredPosts.forEach(p => {
    const tipo = p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem";
    if (!porTipo[tipo]) porTipo[tipo] = { posts: 0, engagement: 0, reach: 0 };
    porTipo[tipo].posts += 1;
    porTipo[tipo].engagement += p.like_count + p.comments_count + p.shares + p.saved;
    porTipo[tipo].reach += p.reach;
  });
  const tipoData = Object.entries(porTipo).map(([tipo, v]) => ({
    tipo, posts: v.posts,
    engPorPost: v.posts > 0 ? Math.round(v.engagement / v.posts) : 0,
    alcancePorPost: v.posts > 0 ? Math.round(v.reach / v.posts) : 0,
  }));

  const weeklyMap: Record<string, { posts: number; engagement: number; reach: number }> = {};
  filteredPosts.forEach(p => {
    const wk = weekLabel(p.posted_at);
    if (!weeklyMap[wk]) weeklyMap[wk] = { posts: 0, engagement: 0, reach: 0 };
    weeklyMap[wk].posts += 1;
    weeklyMap[wk].engagement += p.like_count + p.comments_count + p.shares + p.saved;
    weeklyMap[wk].reach += p.reach;
  });
  const weeklyData = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, v], i) => ({
      semana: `Sem. ${i + 1}`, label: week, posts: v.posts,
      engajamento: v.engagement, alcance: v.reach,
      engPorPost: v.posts > 0 ? Math.round(v.engagement / v.posts) : 0,
    }));

  const selectedLabel = PERIODS.find(p => p.value === period)?.label ?? "Período";
  const isLoading = loadingDaily || loadingPosts;

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Instagram className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">Instagram</h1>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">— Performance de conteúdo</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/40 border border-border">
            {([null, "eduardocristianoriginal", "costurandosucesso"] as (string | null)[]).map((acc) => (
              <button key={acc ?? "todas"} onClick={() => setActiveAccount(acc)}
                className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-all",
                  activeAccount === acc ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {acc === null ? "Todas" : acc === "eduardocristianoriginal" ? "@EC" : "@CS"}
              </button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setDropOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-card text-xs font-semibold text-foreground transition-all">
              {selectedLabel}
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", dropOpen && "rotate-180")} />
            </button>
            {dropOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-popover shadow-xl py-1">
                {PERIODS.map(opt => (
                  <button key={opt.value} onClick={() => { setPeriod(opt.value); setDropOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                      period === opt.value ? "text-primary bg-primary/8" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
              <span className="text-[10px] text-muted-foreground">até</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          )}
          <span className="text-[10px] text-muted-foreground border border-border/60 rounded-md px-2 py-1 font-mono">{start} → {end}</span>
        </div>
      </div>

      {isLoading && <div className="text-xs text-muted-foreground animate-pulse">Carregando dados...</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["eduardocristianoriginal", "costurandosucesso"].map(acc => {
          const followers = lastFollowers[acc] ?? 0;
          const growth = followers - (firstFollowers[acc] ?? followers);
          return (
            <KPICard key={acc} label={ACCOUNT_LABELS[acc]} value={fmt(followers)}
              sub={`${growth >= 0 ? "+" : ""}${fmt(growth)} no período`} icon={Users}
              color={acc === "eduardocristianoriginal" ? "text-rose-500" : "text-sky-500"} />
          );
        })}
        <KPICard label="Posts no período" value={filteredPosts.length}
          sub={`Eng. médio: ${fmt(igEngPorPost)}/post`} icon={TrendingUp} color="text-violet-500" />
        <KPICard label="Engajamento total" value={fmt(igEngTotal)}
          sub={`${fmt(igAlcance)} alcance · ${fmt(igViews)} views`} icon={Heart} color="text-rose-500" accent />
      </div>

      {/* Seguidores ao longo do tempo */}
      {followersChartData.length > 1 && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Seguidores ao longo do tempo</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={followersChartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {accounts.map(acc => (
                <Line key={acc} type="monotone" dataKey={acc} name={ACCOUNT_LABELS[acc] ?? acc}
                  stroke={ACCOUNT_COLORS[acc] ?? "#94a3b8"} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Semanal + por tipo */}
      {(weeklyData.length > 0 || tipoData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weeklyData.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comparativo semanal</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="semana" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="posts" name="Posts" fill="#0ea5e9" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="engajamento" name="Engajamento" fill="#e11d48" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {tipoData.length > 0 && (
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Engajamento médio por tipo</h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={tipoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="tipo" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="engPorPost" name="Eng/post" radius={[4,4,0,0]}>
                    {tipoData.map((entry) => (
                      <Cell key={entry.tipo} fill={entry.tipo === "Reel" ? "#8b5cf6" : entry.tipo === "Carrossel" ? "#f59e0b" : "#0ea5e9"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[10px] text-muted-foreground">
                {tipoData.map(t => (
                  <span key={t.tipo}><span className="font-semibold text-foreground">{t.tipo}</span> — {t.posts} post{t.posts !== 1 ? "s" : ""}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top posts por engajamento</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium">Conta</th>
                  <th className="text-left py-2 pr-3 font-medium">Data</th>
                  <th className="text-left py-2 pr-3 font-medium">Caption</th>
                  <th className="text-left py-2 pr-3 font-medium">Tipo</th>
                  <th className="text-right py-2 pr-3 font-medium"><Heart className="h-3 w-3 inline" /></th>
                  <th className="text-right py-2 pr-3 font-medium">💬</th>
                  <th className="text-right py-2 pr-3 font-medium"><Share2 className="h-3 w-3 inline" /></th>
                  <th className="text-right py-2 pr-3 font-medium"><BookmarkIcon className="h-3 w-3 inline" /></th>
                  <th className="text-right py-2 pr-3 font-medium"><Eye className="h-3 w-3 inline" /></th>
                  <th className="text-right py-2 font-medium">Eng.</th>
                </tr>
              </thead>
              <tbody>
                {topPosts.map(p => (
                  <tr key={p.post_id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="py-2 pr-3 font-semibold" style={{ color: ACCOUNT_COLORS[p.username] }}>
                      @{p.username === "eduardocristianoriginal" ? "EC" : "CS"}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground font-mono">{p.posted_at.split("T")[0]}</td>
                    <td className="py-2 pr-3 max-w-[180px]">
                      <span className="truncate block text-foreground/80" title={p.caption}>
                        {p.caption.slice(0, 50)}{p.caption.length > 50 ? "…" : ""}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                        p.media_type === "VIDEO" ? "bg-violet-500/10 text-violet-400" :
                        p.media_type === "CAROUSEL_ALBUM" ? "bg-amber-500/10 text-amber-400" :
                        "bg-sky-500/10 text-sky-400"
                      )}>
                        {p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono">{fmt(p.like_count)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmt(p.comments_count)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmt(p.shares)}</td>
                    <td className="py-2 pr-3 text-right font-mono">{fmt(p.saved)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-muted-foreground">{p.views ? fmt(p.views) : "—"}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-bold text-foreground">{fmt(p.engagement)}</span>
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && filteredPosts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum post encontrado no período selecionado.</div>
      )}
    </div>
  );
}
