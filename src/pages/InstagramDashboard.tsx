import { useState, useMemo } from "react";
import { Instagram, ChevronDown, ExternalLink, Users, Heart, TrendingUp, Clock, Hash } from "lucide-react";
import { useInstagramPostInsights, useInstagramAccountDaily } from "@/hooks/useInstagramInsights";
import { GlassCard } from "@/components/GlassCard";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, Cell,
} from "recharts";

type Period = "7d" | "15d" | "30d" | "90d" | "custom";
const PERIODS = [
  { label: "Últimos 7 dias",  value: "7d"  as Period },
  { label: "Últimos 15 dias", value: "15d" as Period },
  { label: "Últimos 30 dias", value: "30d" as Period },
  { label: "Últimos 90 dias", value: "90d" as Period },
  { label: "Personalizado",   value: "custom" as Period },
];

function getRange(period: Period, cs: string, ce: string) {
  const today = new Date().toISOString().split("T")[0];
  const sub = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };
  if (period === "7d")  return { start: sub(6),  end: today };
  if (period === "15d") return { start: sub(14), end: today };
  if (period === "30d") return { start: sub(29), end: today };
  if (period === "90d") return { start: sub(89), end: today };
  return { start: cs || sub(29), end: ce || today };
}

const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"k" : String(Math.round(n));
const pct = (n: number) => n.toFixed(1) + "%";

// Paleta CS secundária — coral âmbar + azul ardósia
const C = {
  coral:   "#D4845F",
  coralSoft: "#D4845F33",
  slate:   "#7B9CC4",
  slateSoft: "#7B9CC433",
  gold:    "#C9A84C",
  violet:  "#9B72CF",
  red:     "hsl(355 82% 51%)",
  redSoft: "hsl(355 82% 51% / 0.18)",
};

const ACCOUNT_COLORS: Record<string, string> = {
  eduardocristianoriginal: C.coral,
  costurandosucesso: C.slate,
};
const ACCOUNT_SHORT: Record<string, string> = {
  eduardocristianoriginal: "@EC",
  costurandosucesso: "@CS",
};

const TT = {
  contentStyle: {
    background: "hsl(240 20% 11% / 0.95)",
    border: "1px solid hsl(240 15% 14%)",
    borderRadius: 10,
    fontSize: 11,
    backdropFilter: "blur(12px)",
  },
  cursor: { stroke: "hsl(355 82% 51% / 0.3)", strokeWidth: 1 },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 mb-4">{children}</p>
  );
}

function KPI({ label, value, sub, icon: Icon, color = C.coral, glow = false }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string; glow?: boolean;
}) {
  return (
    <div className={cn("glass-card p-4 flex flex-col gap-1", glow && "glow-red")}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">{label}</span>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <span className="font-display font-bold text-[26px] leading-none text-foreground">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground mt-0.5">{sub}</span>}
    </div>
  );
}

function AccountDot({ username }: { username: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-2 h-2 rounded-full inline-block" style={{ background: ACCOUNT_COLORS[username] ?? "#888" }} />
      <span className="font-semibold text-[10px]" style={{ color: ACCOUNT_COLORS[username] }}>
        {ACCOUNT_SHORT[username] ?? username}
      </span>
    </span>
  );
}

export default function InstagramDashboard() {
  const [period, setPeriod] = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [dropOpen, setDropOpen] = useState(false);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);

  const { start, end } = getRange(period, customStart, customEnd);
  const { data: dailyData = [], isLoading: loadingDaily } = useInstagramAccountDaily(start, end);
  const { data: postsData = [], isLoading: loadingPosts } = useInstagramPostInsights(start, end);

  const filteredPosts = activeAccount ? postsData.filter(p => p.username === activeAccount) : postsData;

  // ── Seguidores ─────────────────────────────────────────────
  const accounts = useMemo(() => [...new Set(dailyData.map(d => d.username))], [dailyData]);
  const followersChart = useMemo(() => {
    const byDate: Record<string, Record<string, number>> = {};
    dailyData.forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = {};
      byDate[d.date][d.username] = d.followers_count;
    });
    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }));
  }, [dailyData]);

  const lastFollowers: Record<string, number> = {};
  const firstFollowers: Record<string, number> = {};
  dailyData.forEach(d => {
    lastFollowers[d.username] = d.followers_count;
    if (!firstFollowers[d.username]) firstFollowers[d.username] = d.followers_count;
  });

  // ── KPIs ──────────────────────────────────────────────────
  const engTotal = filteredPosts.reduce((s, p) => s + p.like_count + p.comments_count + p.shares + p.saved, 0);
  const alcanceTotal = filteredPosts.reduce((s, p) => s + p.reach, 0);
  const viewsTotal = filteredPosts.reduce((s, p) => s + (p.views || 0), 0);
  const taxaEng = alcanceTotal > 0 ? (engTotal / alcanceTotal) * 100 : 0;
  const engPorPost = filteredPosts.length > 0 ? engTotal / filteredPosts.length : 0;

  // ── Por tipo de mídia ─────────────────────────────────────
  const porTipo = useMemo(() => {
    const m: Record<string, { posts: number; eng: number; reach: number; views: number }> = {};
    filteredPosts.forEach(p => {
      const t = p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem";
      if (!m[t]) m[t] = { posts: 0, eng: 0, reach: 0, views: 0 };
      m[t].posts++;
      m[t].eng += p.like_count + p.comments_count + p.shares + p.saved;
      m[t].reach += p.reach;
      m[t].views += p.views || 0;
    });
    return Object.entries(m).map(([tipo, v]) => ({
      tipo,
      posts: v.posts,
      engPorPost: v.posts > 0 ? Math.round(v.eng / v.posts) : 0,
      alcancePorPost: v.posts > 0 ? Math.round(v.reach / v.posts) : 0,
      taxaEng: v.reach > 0 ? parseFloat(((v.eng / v.reach) * 100).toFixed(2)) : 0,
    }));
  }, [filteredPosts]);

  const TIPO_COLORS: Record<string, string> = { Reel: C.violet, Carrossel: C.gold, Imagem: C.slate };

  // ── Melhor horário ────────────────────────────────────────
  const horarioData = useMemo(() => {
    const m: Record<number, { eng: number; posts: number }> = {};
    filteredPosts.forEach(p => {
      const h = new Date(p.posted_at).getHours();
      if (!m[h]) m[h] = { eng: 0, posts: 0 };
      m[h].eng += p.like_count + p.comments_count + p.shares + p.saved;
      m[h].posts++;
    });
    return Array.from({ length: 24 }, (_, h) => ({
      hora: `${String(h).padStart(2,"0")}h`,
      engMedio: m[h] ? Math.round(m[h].eng / m[h].posts) : 0,
      posts: m[h]?.posts ?? 0,
    })).filter(d => d.posts > 0);
  }, [filteredPosts]);

  // ── Frequência semanal ────────────────────────────────────
  const weeklyData = useMemo(() => {
    const m: Record<string, { posts: number; eng: number; reach: number }> = {};
    filteredPosts.forEach(p => {
      const d = new Date(p.posted_at);
      const wstart = new Date(d); wstart.setDate(d.getDate() - d.getDay());
      const wk = wstart.toISOString().split("T")[0];
      if (!m[wk]) m[wk] = { posts: 0, eng: 0, reach: 0 };
      m[wk].posts++;
      m[wk].eng += p.like_count + p.comments_count + p.shares + p.saved;
      m[wk].reach += p.reach;
    });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([wk, v], i) => ({
      semana: `Sem ${i+1}`,
      label: wk,
      posts: v.posts,
      engajamento: v.eng,
      engPorPost: v.posts > 0 ? Math.round(v.eng / v.posts) : 0,
      alcance: v.reach,
    }));
  }, [filteredPosts]);

  // ── Top hashtags ──────────────────────────────────────────
  const hashtagData = useMemo(() => {
    const m: Record<string, number> = {};
    filteredPosts.forEach(p => {
      const tags = (p.caption || "").match(/#[\w\u00C0-\u024F]+/gi) ?? [];
      tags.forEach(t => { m[t.toLowerCase()] = (m[t.toLowerCase()] || 0) + 1; });
    });
    return Object.entries(m).sort(([,a],[,b]) => b - a).slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));
  }, [filteredPosts]);

  // ── Top posts ─────────────────────────────────────────────
  const topPosts = useMemo(() => [...filteredPosts]
    .map(p => ({ ...p, eng: p.like_count + p.comments_count + p.shares + p.saved,
      taxaEng: p.reach > 0 ? ((p.like_count + p.comments_count + p.shares + p.saved) / p.reach * 100) : 0 }))
    .sort((a, b) => b.eng - a.eng).slice(0, 10), [filteredPosts]);

  // ── Crescimento semanal seguidores ────────────────────────
  const growthData = useMemo(() => {
    if (followersChart.length < 2) return [];
    const weeks: Record<string, Record<string, number>> = {};
    followersChart.forEach(d => {
      const dt = new Date(d.date); const ws = new Date(dt); ws.setDate(dt.getDate() - dt.getDay());
      const wk = ws.toISOString().split("T")[0];
      if (!weeks[wk]) weeks[wk] = {};
      accounts.forEach(acc => { if ((d as any)[acc]) weeks[wk][acc] = (d as any)[acc]; });
    });
    return Object.entries(weeks).sort(([a],[b]) => a.localeCompare(b)).map(([wk, v], i, arr) => {
      const prev = i > 0 ? arr[i-1][1] : v;
      const obj: any = { semana: `Sem ${i+1}` };
      accounts.forEach(acc => { obj[acc] = v[acc] ? (v[acc] - (prev[acc] || v[acc])) : 0; });
      return obj;
    }).slice(1);
  }, [followersChart, accounts]);

  const selectedLabel = PERIODS.find(p => p.value === period)?.label ?? "Período";
  const isLoading = loadingDaily || loadingPosts;

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4" style={{ color: C.coral }} />
            <h1 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">Instagram</h1>
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">— Analytics</span>
          </div>
          {!isLoading && <p className="text-[11px] text-muted-foreground mt-1">{filteredPosts.length} posts · {start} → {end}</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Conta */}
          <div className="flex items-center gap-0.5 p-0.5 glass-card">
            {([null, "eduardocristianoriginal", "costurandosucesso"] as (string|null)[]).map(acc => (
              <button key={acc ?? "todas"} onClick={() => setActiveAccount(acc)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  activeAccount === acc
                    ? "text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={activeAccount === acc ? { background: acc ? ACCOUNT_COLORS[acc] : C.coral } : {}}
              >
                {acc === null ? "Todas" : acc === "eduardocristianoriginal" ? "@EC" : "@CS"}
              </button>
            ))}
          </div>

          {/* Período */}
          <div className="relative">
            <button onClick={() => setDropOpen(v => !v)}
              className="glass-card flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/30 transition-all">
              {selectedLabel}
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", dropOpen && "rotate-180")} />
            </button>
            {dropOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-popover/95 backdrop-blur-xl shadow-2xl py-1">
                {PERIODS.map(opt => (
                  <button key={opt.value} onClick={() => { setPeriod(opt.value); setDropOpen(false); }}
                    className={cn("w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                      period === opt.value ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              <span className="text-[10px] text-muted-foreground">até</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
          )}
        </div>
      </div>

      {isLoading && <div className="text-[11px] text-muted-foreground animate-pulse">Carregando dados...</div>}

      {/* ── KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {["eduardocristianoriginal", "costurandosucesso"].map(acc => {
          const f = lastFollowers[acc] ?? 0;
          const g = f - (firstFollowers[acc] ?? f);
          return <KPI key={acc} label={`Seguidores ${ACCOUNT_SHORT[acc]}`} value={fmt(f)}
            sub={`${g >= 0 ? "+" : ""}${fmt(g)} no período`} icon={Users} color={ACCOUNT_COLORS[acc]} />;
        })}
        <KPI label="Engajamento total" value={fmt(engTotal)} sub={`${fmt(filteredPosts.length)} posts`} icon={Heart} color={C.coral} glow />
        <KPI label="Taxa de engajamento" value={pct(taxaEng)} sub="eng ÷ alcance" icon={TrendingUp} color={C.gold} />
        <KPI label="Eng. por post" value={fmt(engPorPost)} sub="média do período" icon={TrendingUp} color={C.violet} />
        <KPI label="Views totais" value={fmt(viewsTotal)} sub={`${fmt(alcanceTotal)} alcance`} icon={Eye} color={C.slate} />
      </div>

      {/* ── Seguidores ao longo do tempo ──────────────────── */}
      {followersChart.length > 1 && (
        <GlassCard>
          <SectionTitle>Crescimento de seguidores</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={followersChart}>
              <defs>
                {accounts.map(acc => (
                  <linearGradient key={acc} id={`grad-${acc}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCOUNT_COLORS[acc]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={ACCOUNT_COLORS[acc]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 14%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
              <Tooltip {...TT} formatter={(v: number) => fmt(v)} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
              {accounts.map(acc => (
                <Area key={acc} type="monotone" dataKey={acc}
                  name={acc === "eduardocristianoriginal" ? "@eduardocristianoriginal" : "@costurandosucesso"}
                  stroke={ACCOUNT_COLORS[acc]} strokeWidth={2}
                  fill={`url(#grad-${acc})`} dot={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* ── Linha 2: Semanal + Horário ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Frequência semanal */}
        {weeklyData.length > 0 && (
          <GlassCard>
            <SectionTitle>Frequência semanal vs engajamento</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 14%)" />
                <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip {...TT} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="left" dataKey="posts" name="Posts" fill={C.slate} radius={[4,4,0,0]} opacity={0.8} />
                <Bar yAxisId="right" dataKey="engPorPost" name="Eng/post" fill={C.coral} radius={[4,4,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* Melhor horário */}
        {horarioData.length > 0 && (
          <GlassCard>
            <SectionTitle>Melhor horário para postar</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={horarioData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 14%)" />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip {...TT} />
                <Bar dataKey="engMedio" name="Eng. médio" radius={[4,4,0,0]}>
                  {horarioData.map((entry) => {
                    const max = Math.max(...horarioData.map(d => d.engMedio));
                    const ratio = max > 0 ? entry.engMedio / max : 0;
                    const alpha = Math.round(40 + ratio * 215).toString(16).padStart(2,"0");
                    return <Cell key={entry.hora} fill={`${C.coral}${alpha}`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}
      </div>

      {/* ── Linha 3: Por tipo + Crescimento semanal ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Por tipo de mídia — Radar */}
        {porTipo.length > 0 && (
          <GlassCard>
            <SectionTitle>Performance por formato</SectionTitle>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {porTipo.map(t => (
                <div key={t.tipo} className="rounded-lg p-2.5 text-center" style={{ background: `${TIPO_COLORS[t.tipo] ?? C.coral}18`, border: `1px solid ${TIPO_COLORS[t.tipo] ?? C.coral}30` }}>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: TIPO_COLORS[t.tipo] }}>{t.tipo}</div>
                  <div className="font-display font-bold text-lg text-foreground">{fmt(t.engPorPost)}</div>
                  <div className="text-[9px] text-muted-foreground">eng/post</div>
                  <div className="text-[9px] text-muted-foreground">{pct(t.taxaEng)} taxa</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={porTipo} layout="vertical" barCategoryGap="25%">
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <YAxis type="category" dataKey="tipo" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} width={60} />
                <Tooltip {...TT} />
                <Bar dataKey="alcancePorPost" name="Alcance/post" radius={[0,4,4,0]}>
                  {porTipo.map(t => <Cell key={t.tipo} fill={TIPO_COLORS[t.tipo] ?? C.coral} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* Crescimento semanal de seguidores */}
        {growthData.length > 0 && (
          <GlassCard>
            <SectionTitle>Novos seguidores por semana</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={growthData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 14%)" />
                <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} tickLine={false} axisLine={false} />
                <Tooltip {...TT} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                {accounts.map(acc => (
                  <Bar key={acc} dataKey={acc}
                    name={acc === "eduardocristianoriginal" ? "@EC" : "@CS"}
                    fill={ACCOUNT_COLORS[acc]} radius={[4,4,0,0]} opacity={0.85} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}
      </div>

      {/* ── Top hashtags ──────────────────────────────────── */}
      {hashtagData.length > 0 && (
        <GlassCard>
          <SectionTitle>Hashtags mais usadas</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {hashtagData.map((h, i) => {
              const max = hashtagData[0].count;
              const ratio = h.count / max;
              const size = ratio > 0.7 ? "text-sm" : ratio > 0.4 ? "text-xs" : "text-[10px]";
              return (
                <span key={h.tag} className={cn("px-2.5 py-1 rounded-full font-medium transition-all cursor-default", size)}
                  style={{
                    background: `${C.coral}${Math.round(10 + ratio * 25).toString(16).padStart(2,"0")}`,
                    border: `1px solid ${C.coral}${Math.round(30 + ratio * 60).toString(16).padStart(2,"0")}`,
                    color: `hsl(0 0% ${60 + ratio * 36}%)`,
                  }}>
                  {h.tag} <span className="text-[9px] opacity-60">×{h.count}</span>
                </span>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* ── Top posts ─────────────────────────────────────── */}
      {topPosts.length > 0 && (
        <GlassCard>
          <SectionTitle>Top posts por engajamento</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Conta","Data","Tipo","Caption","❤️","💬","🔁","🔖","Taxa eng.","Eng."].map(h => (
                    <th key={h} className={cn("py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                      ["❤️","💬","🔁","🔖","Taxa eng.","Eng."].includes(h) ? "text-right pr-3" : "text-left pr-3"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPosts.map((p, i) => (
                  <tr key={p.post_id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-3"><AccountDot username={p.username} /></td>
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-muted-foreground">{p.posted_at.split("T")[0]}</td>
                    <td className="py-2.5 pr-3">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: `${TIPO_COLORS[p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem"] ?? C.coral}20`,
                          color: TIPO_COLORS[p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem"] ?? C.coral }}>
                        {p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Img"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 max-w-[160px]">
                      <span className="block truncate text-[11px] text-foreground/70" title={p.caption}>
                        {p.caption.slice(0,45)}{p.caption.length > 45 ? "…" : ""}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-[11px] font-mono text-muted-foreground">{fmt(p.like_count)}</td>
                    <td className="py-2.5 pr-3 text-right text-[11px] font-mono text-muted-foreground">{fmt(p.comments_count)}</td>
                    <td className="py-2.5 pr-3 text-right text-[11px] font-mono text-muted-foreground">{fmt(p.shares)}</td>
                    <td className="py-2.5 pr-3 text-right text-[11px] font-mono text-muted-foreground">{fmt(p.saved)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className="text-[11px] font-semibold" style={{ color: p.taxaEng > 3 ? C.coral : "hsl(0 0% 60%)" }}>
                        {pct(p.taxaEng)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-display font-bold text-sm text-foreground">{fmt(p.eng)}</span>
                        <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground/40 hover:text-primary transition-colors">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {!isLoading && filteredPosts.length === 0 && (
        <GlassCard>
          <p className="text-center py-8 text-muted-foreground text-sm">Nenhum post encontrado no período selecionado.</p>
        </GlassCard>
      )}
    </div>
  );
}

// Fix missing import
function Eye({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
}
