import { useState, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetaAdsInsights } from "@/hooks/useMetaAdsInsights";
import { useWppCampanhasResumo } from "@/hooks/useWppCampanhasResumo";
import { useInstagramPostInsights, useInstagramAccountDaily } from "@/hooks/useInstagramInsights";
import {
  TrendingUp, Megaphone, MessageCircle, DollarSign,
  Users, BarChart2, Send, CheckCheck, Eye, Instagram,
  ExternalLink, Heart, Share2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, Cell, FunnelChart, Funnel, LabelList,
} from "recharts";
import { cn } from "@/lib/utils";

// Paleta CS secundária
const C = {
  coral:  "#D4845F",
  slate:  "#7B9CC4",
  gold:   "#C9A84C",
  violet: "#9B72CF",
  red:    "hsl(355 82% 51%)",
  green:  "#4CAF87",
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

const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"k" : String(Math.round(n));
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => n.toFixed(1) + "%";

type Tab = "meta" | "wpp" | "instagram";

interface Props { from: string; to: string; }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70 mb-4">{children}</p>;
}

function KPI({ label, value, sub, icon: Icon, color = C.coral, highlight = false }: {
  label: string; value: string | number; sub?: string; icon: any; color?: string; highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-border p-4 flex flex-col gap-1 bg-card/50 backdrop-blur-sm",
      highlight && "border-primary/30 bg-primary/5")}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">{label}</span>
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <span className="font-display font-bold text-[26px] leading-none text-foreground">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground mt-0.5">{sub}</span>}
    </div>
  );
}

const ACCOUNT_COLORS: Record<string, string> = {
  eduardocristianoriginal: C.coral,
  costurandosucesso: C.slate,
};
const ACCOUNT_SHORT: Record<string, string> = {
  eduardocristianoriginal: "@EC",
  costurandosucesso: "@CS",
};
const TIPO_COLORS: Record<string, string> = { Reel: C.violet, Carrossel: C.gold, Imagem: C.slate };

export function MarketingSection({ from, to }: Props) {
  const [tab, setTab] = useState<Tab>("meta");

  const { data: metaData = [], isLoading: loadingMeta } = useMetaAdsInsights(from, to);
  const { data: wppData, isLoading: loadingWpp } = useWppCampanhasResumo(from, to);
  const { data: postsData = [], isLoading: loadingPosts } = useInstagramPostInsights(from, to);
  const { data: dailyData = [] } = useInstagramAccountDaily(from, to);

  // ── META ADS ─────────────────────────────────────────────
  const metaTotais = useMemo(() => metaData.reduce(
    (acc, r) => ({
      spend: acc.spend + (r.spend || 0),
      leads: acc.leads + (r.leads || 0),
      purchases: acc.purchases + (r.purchases || 0),
      purchase_value: acc.purchase_value + (r.purchase_value || 0),
      impressions: acc.impressions + (r.impressions || 0),
      clicks: acc.clicks + (r.clicks || 0),
    }),
    { spend: 0, leads: 0, purchases: 0, purchase_value: 0, impressions: 0, clicks: 0 }
  ), [metaData]);

  const metaCPL  = metaTotais.leads > 0 ? metaTotais.spend / metaTotais.leads : 0;
  const metaROAS = metaTotais.spend > 0 ? metaTotais.purchase_value / metaTotais.spend : 0;
  const metaCTR  = metaTotais.impressions > 0 ? (metaTotais.clicks / metaTotais.impressions) * 100 : 0;

  const porCampanha = useMemo(() => {
    const m: Record<string, { name: string; spend: number; leads: number; purchases: number; purchase_value: number; impressions: number; clicks: number }> = {};
    metaData.forEach(r => {
      if (!m[r.campaign_id]) m[r.campaign_id] = { name: r.campaign_name, spend: 0, leads: 0, purchases: 0, purchase_value: 0, impressions: 0, clicks: 0 };
      m[r.campaign_id].spend += r.spend || 0;
      m[r.campaign_id].leads += r.leads || 0;
      m[r.campaign_id].purchases += r.purchases || 0;
      m[r.campaign_id].purchase_value += r.purchase_value || 0;
      m[r.campaign_id].impressions += r.impressions || 0;
      m[r.campaign_id].clicks += r.clicks || 0;
    });
    return Object.values(m).sort((a, b) => b.spend - a.spend);
  }, [metaData]);

  // CPL ao longo do tempo (agrupado por dia)
  const cplDiario = useMemo(() => {
    const m: Record<string, { spend: number; leads: number }> = {};
    metaData.forEach(r => {
      if (!m[r.date_start]) m[r.date_start] = { spend: 0, leads: 0 };
      m[r.date_start].spend += r.spend || 0;
      m[r.date_start].leads += r.leads || 0;
    });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([date, v]) => ({
      date, cpl: v.leads > 0 ? parseFloat((v.spend / v.leads).toFixed(2)) : 0, leads: v.leads, spend: v.spend,
    })).filter(d => d.cpl > 0);
  }, [metaData]);

  // ROAS por campanha (barras horizontais rankeadas)
  const raosByCampanha = useMemo(() => porCampanha
    .map(c => ({ name: c.name.length > 22 ? c.name.slice(0,20)+"…" : c.name,
      roas: c.spend > 0 ? parseFloat((c.purchase_value / c.spend).toFixed(2)) : 0, spend: c.spend }))
    .filter(c => c.roas > 0).sort((a,b) => b.roas - a.roas).slice(0, 6), [porCampanha]);

  // Funil: impressões → cliques → leads → compras
  const funnelData = [
    { name: "Impressões", value: metaTotais.impressions, fill: C.coral },
    { name: "Cliques",    value: metaTotais.clicks,      fill: C.gold  },
    { name: "Leads",      value: metaTotais.leads,       fill: C.slate },
    { name: "Compras",    value: metaTotais.purchases,   fill: C.green },
  ].filter(d => d.value > 0);

  // ── WPP ──────────────────────────────────────────────────
  const wppTotais    = wppData?.totais;
  const wppCampanhas = wppData?.campanhas ?? [];

  // ── INSTAGRAM ─────────────────────────────────────────────
  const lastFollowers: Record<string, number> = {};
  dailyData.forEach(d => { lastFollowers[d.username] = d.followers_count; });

  const igEngTotal  = postsData.reduce((s,p) => s + p.like_count + p.comments_count + p.shares + p.saved, 0);
  const igAlcance   = postsData.reduce((s,p) => s + p.reach, 0);
  const igTaxaEng   = igAlcance > 0 ? (igEngTotal / igAlcance) * 100 : 0;

  const topPosts = useMemo(() => [...postsData]
    .map(p => ({ ...p, eng: p.like_count + p.comments_count + p.shares + p.saved }))
    .sort((a,b) => b.eng - a.eng).slice(0, 5), [postsData]);

  const porTipo = useMemo(() => {
    const m: Record<string, { posts: number; eng: number; reach: number }> = {};
    postsData.forEach(p => {
      const t = p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem";
      if (!m[t]) m[t] = { posts: 0, eng: 0, reach: 0 };
      m[t].posts++; m[t].eng += p.like_count + p.comments_count + p.shares + p.saved; m[t].reach += p.reach;
    });
    return Object.entries(m).map(([tipo, v]) => ({
      tipo, posts: v.posts, engPorPost: v.posts > 0 ? Math.round(v.eng/v.posts) : 0,
    }));
  }, [postsData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Marketing — Performance de Canais</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl glass-card w-fit">
        {([
          { key: "meta", label: "Meta Ads", Icon: Megaphone },
          { key: "wpp",  label: "WPP Campanhas", Icon: MessageCircle },
          { key: "instagram", label: "Instagram", Icon: Instagram },
        ] as { key: Tab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      {/* ── TAB META ADS ── */}
      {tab === "meta" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingMeta ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-24 rounded-xl"/>) : (<>
              <KPI label="Investido" value={brl(metaTotais.spend)} sub="Total no período" icon={DollarSign} color={C.coral} />
              <KPI label="Leads gerados" value={fmt(metaTotais.leads)} sub={`CPL ${brl(metaCPL)}`} icon={Users} color={C.gold} highlight />
              <KPI label="Compras (Meta)" value={metaTotais.purchases} sub={`${brl(metaTotais.purchase_value)} receita`} icon={BarChart2} color={C.green} />
              <KPI label="ROAS" value={`${metaROAS.toFixed(2)}×`} sub={`CTR ${pct(metaCTR)}`} icon={TrendingUp} color={C.violet} highlight={metaROAS>=3} />
            </>)}
          </div>

          {!loadingMeta && metaData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CPL ao longo do tempo */}
              {cplDiario.length > 1 && (
                <GlassCard>
                  <SectionTitle>CPL ao longo do tempo</SectionTitle>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={cplDiario}>
                      <defs>
                        <linearGradient id="gradCpl" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={C.coral} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={C.coral} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 15% 14%)"/>
                      <XAxis dataKey="date" tick={{fontSize:10,fill:"hsl(0 0% 60%)"}} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:10,fill:"hsl(0 0% 60%)"}} tickLine={false} axisLine={false} tickFormatter={v=>`R$${v}`}/>
                      <Tooltip {...TT} formatter={(v:number) => brl(v)}/>
                      <Area type="monotone" dataKey="cpl" name="CPL" stroke={C.coral} strokeWidth={2} fill="url(#gradCpl)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>
              )}

              {/* ROAS por campanha */}
              {raosByCampanha.length > 0 && (
                <GlassCard>
                  <SectionTitle>ROAS por campanha</SectionTitle>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={raosByCampanha} layout="vertical" barCategoryGap="20%">
                      <XAxis type="number" tick={{fontSize:10,fill:"hsl(0 0% 60%)"}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}×`}/>
                      <YAxis type="category" dataKey="name" tick={{fontSize:9,fill:"hsl(0 0% 60%)"}} tickLine={false} axisLine={false} width={90}/>
                      <Tooltip {...TT} formatter={(v:number) => `${v}×`}/>
                      <Bar dataKey="roas" name="ROAS" radius={[0,4,4,0]}>
                        {raosByCampanha.map((e,i) => <Cell key={i} fill={e.roas >= 3 ? C.green : e.roas >= 1 ? C.gold : C.coral}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>
              )}
            </div>
          )}

          {/* Funil de conversão */}
          {!loadingMeta && funnelData.length > 0 && (
            <GlassCard>
              <SectionTitle>Funil de conversão</SectionTitle>
              <div className="grid grid-cols-4 gap-3">
                {funnelData.map((f, i) => {
                  const next = funnelData[i+1];
                  const rate = next && f.value > 0 ? (next.value / f.value * 100) : null;
                  return (
                    <div key={f.name} className="text-center">
                      <div className="rounded-xl p-3 mb-2" style={{ background: `${f.fill}18`, border: `1px solid ${f.fill}30` }}>
                        <div className="font-display font-bold text-2xl text-foreground">{fmt(f.value)}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest mt-1" style={{ color: f.fill }}>{f.name}</div>
                      </div>
                      {rate !== null && (
                        <div className="text-[10px] text-muted-foreground">→ {pct(rate)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Tabela campanhas */}
          {!loadingMeta && porCampanha.length > 0 && (
            <GlassCard>
              <SectionTitle>Detalhamento por campanha</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campanha","Investido","Leads","CPL","Compras","ROAS"].map(h => (
                        <th key={h} className={cn("py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          h==="Campanha" ? "text-left pr-3" : "text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {porCampanha.map((c,i) => {
                      const cpl  = c.leads > 0 ? c.spend / c.leads : 0;
                      const roas = c.spend > 0 ? c.purchase_value / c.spend : 0;
                      return (
                        <tr key={i} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-3 text-[11px] font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] text-muted-foreground">{brl(c.spend)}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] font-semibold text-foreground">{c.leads}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] text-muted-foreground">{cpl>0?brl(cpl):"—"}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] text-muted-foreground">{c.purchases}</td>
                          <td className={cn("py-2.5 pr-3 text-right text-[11px] font-semibold",
                            roas>=3?"text-emerald-400":roas>0?"text-muted-foreground":"text-muted-foreground/40")}>
                            {roas>0?`${roas.toFixed(1)}×`:"—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {!loadingMeta && metaData.length === 0 && (
            <GlassCard><p className="text-center py-8 text-muted-foreground text-sm">Sem dados do Meta Ads no período — aguarde a próxima sincronização do N8N.</p></GlassCard>
          )}
        </div>
      )}

      {/* ── TAB WPP ── */}
      {tab === "wpp" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingWpp ? Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>) : (<>
              <KPI label="Campanhas"  value={wppTotais?.campanhas??0}    sub="Disparadas no período" icon={MessageCircle} color={C.slate}/>
              <KPI label="Enviadas"   value={fmt(wppTotais?.enviadas??0)} sub={`${(wppTotais?.taxaEntrega??0).toFixed(1)}% entrega`} icon={Send} color={C.coral}/>
              <KPI label="Entregues"  value={fmt(wppTotais?.entregues??0)} icon={CheckCheck} color={C.gold} highlight/>
              <KPI label="Lidas"      value={fmt(wppTotais?.lidas??0)}   sub={`${(wppTotais?.taxaLeitura??0).toFixed(1)}% leitura`} icon={Eye} color={C.green} highlight={(wppTotais?.taxaLeitura??0)>=50}/>
            </>)}
          </div>
          {!loadingWpp && wppCampanhas.length > 0 && (
            <GlassCard>
              <SectionTitle>Campanhas WPP — Detalhamento</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campanha","Enviadas","Entregues","Lidas","% Leitura","Falhas","Status"].map(h=>(
                        <th key={h} className={cn("py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          h==="Campanha"?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wppCampanhas.map(c => {
                      const tl = c.entregues>0?(c.lidos/c.entregues)*100:0;
                      return (
                        <tr key={c.id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 pr-3 text-[11px] font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] text-muted-foreground">{c.total_envios.toLocaleString("pt-BR")}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] text-muted-foreground">{c.entregues.toLocaleString("pt-BR")}</td>
                          <td className="py-2.5 pr-3 text-right text-[11px] font-semibold text-foreground">{c.lidos.toLocaleString("pt-BR")}</td>
                          <td className={cn("py-2.5 pr-3 text-right text-[11px] font-semibold",tl>=50?"text-emerald-400":tl>0?"text-amber-400":"text-muted-foreground/40")}>
                            {tl>0?pct(tl):"—"}
                          </td>
                          <td className={cn("py-2.5 pr-3 text-right text-[11px]",c.falhas>0?"text-destructive":"text-muted-foreground/40")}>
                            {c.falhas>0?c.falhas:"—"}
                          </td>
                          <td className="py-2.5 pr-3 text-right">
                            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold",
                              c.status==="completed"?"bg-emerald-500/10 text-emerald-400":
                              c.status==="firing"?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
          {!loadingWpp && wppCampanhas.length === 0 && (
            <GlassCard><p className="text-center py-8 text-muted-foreground text-sm">Nenhuma campanha WPP no período.</p></GlassCard>
          )}
        </div>
      )}

      {/* ── TAB INSTAGRAM ── */}
      {tab === "instagram" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["eduardocristianoriginal","costurandosucesso"].map(acc => (
              <KPI key={acc} label={`Seguidores ${ACCOUNT_SHORT[acc]}`}
                value={fmt(lastFollowers[acc]??0)} sub="atualizado hoje"
                icon={Users} color={ACCOUNT_COLORS[acc]}/>
            ))}
            <KPI label="Engajamento total" value={fmt(igEngTotal)} sub={`${postsData.length} posts no período`} icon={Heart} color={C.coral} highlight/>
            <KPI label="Taxa de engajamento" value={`${igTaxaEng.toFixed(1)}%`} sub={`${fmt(igAlcance)} alcance total`} icon={TrendingUp} color={C.gold}/>
          </div>

          {/* Engajamento por tipo */}
          {porTipo.length > 0 && (
            <GlassCard>
              <SectionTitle>Engajamento médio por formato</SectionTitle>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {porTipo.map(t => (
                  <div key={t.tipo} className="rounded-lg p-3 text-center"
                    style={{ background: `${TIPO_COLORS[t.tipo]??C.coral}15`, border: `1px solid ${TIPO_COLORS[t.tipo]??C.coral}25` }}>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{color:TIPO_COLORS[t.tipo]}}>{t.tipo}</div>
                    <div className="font-display font-bold text-xl text-foreground">{fmt(t.engPorPost)}</div>
                    <div className="text-[9px] text-muted-foreground">{t.posts} posts</div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Top posts */}
          {topPosts.length > 0 && (
            <GlassCard>
              <SectionTitle>Top posts — engajamento</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Conta","Data","Tipo","❤️","Alcance","Eng."].map(h=>(
                        <th key={h} className={cn("py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          ["Conta","Data","Tipo"].includes(h)?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map(p => (
                      <tr key={p.post_id} className="border-b border-border/30 hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pr-3">
                          <span className="text-[10px] font-semibold" style={{color:ACCOUNT_COLORS[p.username]??C.coral}}>
                            {ACCOUNT_SHORT[p.username]??p.username}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[10px] text-muted-foreground">{p.posted_at.split("T")[0]}</td>
                        <td className="py-2.5 pr-3">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                            style={{background:`${TIPO_COLORS[p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem"]??C.coral}20`,
                              color:TIPO_COLORS[p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem"]??C.coral}}>
                            {p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Img"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-[11px] font-mono text-muted-foreground">{fmt(p.like_count)}</td>
                        <td className="py-2.5 pr-3 text-right text-[11px] font-mono text-muted-foreground">{fmt(p.reach)}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-display font-bold text-sm text-foreground">{fmt(p.eng)}</span>
                            <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground/40 hover:text-primary transition-colors">
                              <ExternalLink className="h-3 w-3"/>
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

          {!loadingPosts && postsData.length === 0 && (
            <GlassCard><p className="text-center py-8 text-muted-foreground text-sm">Nenhum post encontrado no período.</p></GlassCard>
          )}
        </div>
      )}
    </div>
  );
}

// Inline icon fix
function Send(p: any) { return <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>; }
function CheckCheck(p: any) { return <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>; }
function Eye(p: any) { return <svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; }
