import { useState, useMemo } from "react";
import { GlassCard } from "@/components/GlassCard";
import { KPICard } from "@/components/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetaAdsInsights } from "@/hooks/useMetaAdsInsights";
import { useWppCampanhasResumo } from "@/hooks/useWppCampanhasResumo";
import { useInstagramPostInsights, useInstagramAccountDaily } from "@/hooks/useInstagramInsights";
import {
  TrendingUp, Megaphone, MessageCircle, DollarSign,
  Users, BarChart2, Send, CheckCheck, Eye, Instagram,
  ExternalLink, Heart, Clock, Hash,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

// Tooltip padrão do CS Dash
const TT = {
  contentStyle: {
    background: "hsl(240 20% 11%)",
    border: "1px solid hsl(240 15% 14%)",
    borderRadius: 10,
    fontSize: 11,
    color: "hsl(0 0% 96%)",
  },
  cursor: { fill: "hsl(0 0% 100% / 0.03)" },
};

const fmt  = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"k" : String(Math.round(n));
const brl  = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const pct  = (n: number) => n.toFixed(1) + "%";

// Cores do CS Dash — só primary e variações
const P  = "hsl(355 82% 51%)";       // vermelho primary
const P2 = "hsl(355 82% 51% / 0.5)"; // primary 50%
const P3 = "hsl(355 82% 51% / 0.2)"; // primary 20%
const MUTED = "hsl(0 0% 60%)";

type Tab = "meta" | "wpp" | "instagram";
interface Props { from: string; to: string; }

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

const ACCOUNT_LABEL: Record<string, string> = {
  eduardocristianoriginal: "@eduardocristianoriginal",
  costurandosucesso: "@costurandosucesso",
};

export function MarketingSection({ from, to }: Props) {
  const [tab, setTab] = useState<Tab>("meta");

  const { data: metaData = [], isLoading: loadingMeta } = useMetaAdsInsights(from, to);
  const { data: wppData,        isLoading: loadingWpp  } = useWppCampanhasResumo(from, to);
  const { data: postsData = [], isLoading: loadingIG   } = useInstagramPostInsights(from, to);
  const { data: dailyData = []                          } = useInstagramAccountDaily(from, to);

  // ── META ────────────────────────────────────────────────
  const metaTotais = useMemo(() => metaData.reduce(
    (a, r) => ({
      spend: a.spend + (r.spend||0), leads: a.leads + (r.leads||0),
      purchases: a.purchases + (r.purchases||0),
      purchase_value: a.purchase_value + (r.purchase_value||0),
      impressions: a.impressions + (r.impressions||0),
      clicks: a.clicks + (r.clicks||0),
    }),
    { spend:0, leads:0, purchases:0, purchase_value:0, impressions:0, clicks:0 }
  ), [metaData]);

  const metaCPL  = metaTotais.leads  > 0 ? metaTotais.spend / metaTotais.leads  : 0;
  const metaROAS = metaTotais.spend  > 0 ? metaTotais.purchase_value / metaTotais.spend : 0;

  const porCampanha = useMemo(() => {
    const m: Record<string, { name: string; spend: number; leads: number; purchases: number; purchase_value: number }> = {};
    metaData.forEach(r => {
      if (!m[r.campaign_id]) m[r.campaign_id] = { name: r.campaign_name, spend:0, leads:0, purchases:0, purchase_value:0 };
      m[r.campaign_id].spend         += r.spend||0;
      m[r.campaign_id].leads         += r.leads||0;
      m[r.campaign_id].purchases     += r.purchases||0;
      m[r.campaign_id].purchase_value += r.purchase_value||0;
    });
    return Object.values(m).sort((a,b) => b.spend - a.spend);
  }, [metaData]);

  const metaChartData = porCampanha.slice(0,6).map(c => ({
    name: c.name.length > 20 ? c.name.slice(0,18)+"…" : c.name,
    Investido: parseFloat(c.spend.toFixed(2)),
    Leads: c.leads,
  }));

  // ── WPP ─────────────────────────────────────────────────
  const wppTotais    = wppData?.totais;
  const wppCampanhas = wppData?.campanhas ?? [];

  // ── INSTAGRAM ────────────────────────────────────────────
  const igAccounts = useMemo(() => [...new Set(dailyData.map(d => d.username))], [dailyData]);

  const lastFollowers:  Record<string,number> = {};
  const firstFollowers: Record<string,number> = {};
  dailyData.forEach(d => {
    lastFollowers[d.username]  = d.followers_count;
    if (!firstFollowers[d.username]) firstFollowers[d.username] = d.followers_count;
  });

  // Seguidores por dia (área)
  const followersChart = useMemo(() => {
    const byDate: Record<string, Record<string,number>> = {};
    dailyData.forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = {};
      byDate[d.date][d.username] = d.followers_count;
    });
    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [dailyData]);

  // KPIs Instagram
  const igEngTotal  = postsData.reduce((s,p) => s + p.like_count + p.comments_count + p.shares + p.saved, 0);
  const igAlcance   = postsData.reduce((s,p) => s + p.reach, 0);
  const igViews     = postsData.reduce((s,p) => s + (p.views||0), 0);
  const igTaxaEng   = igAlcance > 0 ? (igEngTotal / igAlcance) * 100 : 0;
  const igEngPost   = postsData.length > 0 ? igEngTotal / postsData.length : 0;

  // Por formato
  const porFormato = useMemo(() => {
    const m: Record<string,{posts:number;eng:number;reach:number}> = {};
    postsData.forEach(p => {
      const t = p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem";
      if (!m[t]) m[t] = {posts:0,eng:0,reach:0};
      m[t].posts++; m[t].eng += p.like_count+p.comments_count+p.shares+p.saved; m[t].reach += p.reach;
    });
    const total = Object.values(m).reduce((s,v) => s + v.eng, 0);
    return Object.entries(m).map(([tipo,v]) => ({
      tipo,
      posts: v.posts,
      engPorPost: v.posts > 0 ? Math.round(v.eng/v.posts) : 0,
      alcancePorPost: v.posts > 0 ? Math.round(v.reach/v.posts) : 0,
      taxaEng: v.reach > 0 ? parseFloat(((v.eng/v.reach)*100).toFixed(1)) : 0,
      share: total > 0 ? Math.round((v.eng/total)*100) : 0,
    })).sort((a,b) => b.engPorPost - a.engPorPost);
  }, [postsData]);

  // Melhor horário
  const horarioData = useMemo(() => {
    const m: Record<number,{eng:number;posts:number}> = {};
    postsData.forEach(p => {
      const h = new Date(p.posted_at).getHours();
      if (!m[h]) m[h] = {eng:0,posts:0};
      m[h].eng += p.like_count+p.comments_count+p.shares+p.saved;
      m[h].posts++;
    });
    return Array.from({length:24},(_,h) => ({
      hora: `${String(h).padStart(2,"0")}h`,
      engMedio: m[h] ? Math.round(m[h].eng/m[h].posts) : 0,
      posts: m[h]?.posts ?? 0,
    })).filter(d => d.posts > 0);
  }, [postsData]);

  const maxHorario = Math.max(...horarioData.map(d => d.engMedio), 1);

  // Frequência semanal
  const weeklyData = useMemo(() => {
    const m: Record<string,{posts:number;eng:number;engPorPost?:number}> = {};
    postsData.forEach(p => {
      const d = new Date(p.posted_at);
      const ws = new Date(d); ws.setDate(d.getDate()-d.getDay());
      const wk = ws.toISOString().split("T")[0];
      if (!m[wk]) m[wk] = {posts:0,eng:0};
      m[wk].posts++;
      m[wk].eng += p.like_count+p.comments_count+p.shares+p.saved;
    });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([wk,v],i) => ({
      semana: `Sem ${i+1}`,
      posts: v.posts,
      engPorPost: v.posts > 0 ? Math.round(v.eng/v.posts) : 0,
    }));
  }, [postsData]);

  // Hashtags
  const hashtagData = useMemo(() => {
    const m: Record<string,number> = {};
    postsData.forEach(p => {
      (p.caption||"").match(/#[\w\u00C0-\u024F]+/gi)?.forEach(t => {
        m[t.toLowerCase()] = (m[t.toLowerCase()]||0)+1;
      });
    });
    return Object.entries(m).sort(([,a],[,b]) => b-a).slice(0,15).map(([tag,count]) => ({tag,count}));
  }, [postsData]);

  // Top posts
  const topPosts = useMemo(() => [...postsData]
    .map(p => ({...p, eng: p.like_count+p.comments_count+p.shares+p.saved,
      taxaEng: p.reach>0 ? (p.like_count+p.comments_count+p.shares+p.saved)/p.reach*100 : 0}))
    .sort((a,b) => b.eng-a.eng).slice(0,10), [postsData]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Marketing — Performance de Canais
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-card/40 w-fit">
        {([
          { key:"meta",      label:"Meta Ads",      Icon:Megaphone    },
          { key:"wpp",       label:"WPP Campanhas", Icon:MessageCircle},
          { key:"instagram", label:"Instagram",     Icon:Instagram    },
        ] as {key:Tab;label:string;Icon:any}[]).map(({key,label,Icon}) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab===key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-3 w-3" />{label}
          </button>
        ))}
      </div>

      {/* ── META ADS ── */}
      {tab==="meta" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingMeta ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-[90px] rounded-xl"/>) : (<>
              <KPICard title="Investido (Ads)"
                value={`R$ ${metaTotais.spend.toLocaleString("pt-BR",{maximumFractionDigits:0})}`}
                subtitle="Total no período" icon={DollarSign} />
              <KPICard title="Leads Gerados"
                value={metaTotais.leads.toLocaleString("pt-BR")}
                subtitle={`CPL R$ ${metaCPL.toLocaleString("pt-BR",{maximumFractionDigits:0})}`}
                icon={Users} />
              <KPICard title="Compras (Meta)"
                value={metaTotais.purchases.toLocaleString("pt-BR")}
                subtitle={`R$ ${metaTotais.purchase_value.toLocaleString("pt-BR",{maximumFractionDigits:0})} em receita`}
                icon={BarChart2} />
              <KPICard title="ROAS"
                value={`${metaROAS.toFixed(2)}×`}
                subtitle={`${metaTotais.impressions.toLocaleString("pt-BR")} impressões`}
                icon={TrendingUp} accent={metaROAS>=3?"gold":"red"} />
            </>)}
          </div>

          {!loadingMeta && metaChartData.length > 0 && (
            <GlassCard>
              <SubTitle>Investido × Leads por Campanha</SubTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metaChartData} margin={{left:0,right:8}}>
                  <XAxis dataKey="name" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis yAxisId="left"  tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}
                    tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip {...TT} formatter={(v:number,name:string) =>
                    name==="Investido" ? `R$ ${v.toLocaleString("pt-BR")}` : v}/>
                  <Legend wrapperStyle={{fontSize:11,color:MUTED}}/>
                  <Bar yAxisId="left"  dataKey="Investido" fill={P}  radius={[4,4,0,0]} opacity={0.85}/>
                  <Bar yAxisId="right" dataKey="Leads"     fill={P2} radius={[4,4,0,0]} opacity={0.7}/>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {!loadingMeta && porCampanha.length > 0 && (
            <GlassCard>
              <SubTitle>Detalhamento por Campanha</SubTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campanha","Investido","Leads","CPL","Compras","ROAS"].map(h => (
                        <th key={h} className={cn("py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          h==="Campanha"?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {porCampanha.map((c,i) => {
                      const cpl  = c.leads>0 ? c.spend/c.leads : 0;
                      const roas = c.spend>0 ? c.purchase_value/c.spend : 0;
                      return (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="py-2 pr-3 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{brl(c.spend)}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-foreground">{c.leads}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{cpl>0?brl(cpl):"—"}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{c.purchases}</td>
                          <td className={cn("py-2 pr-3 text-right font-semibold",
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

          {!loadingMeta && metaData.length===0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Sem dados do Meta Ads no período — aguarde a próxima sincronização do N8N.
            </div>
          )}
        </div>
      )}

      {/* ── WPP ── */}
      {tab==="wpp" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingWpp ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-[90px] rounded-xl"/>) : (<>
              <KPICard title="Campanhas"  value={wppTotais?.campanhas??0}    subtitle="Disparadas no período" icon={MessageCircle}/>
              <KPICard title="Enviadas"   value={fmt(wppTotais?.enviadas??0)} subtitle={`${(wppTotais?.taxaEntrega??0).toFixed(1)}% entrega`} icon={DollarSign}/>
              <KPICard title="Entregues"  value={fmt(wppTotais?.entregues??0)} icon={CheckCheck}/>
              <KPICard title="Lidas"      value={fmt(wppTotais?.lidas??0)} subtitle={`${(wppTotais?.taxaLeitura??0).toFixed(1)}% leitura`} icon={Eye} accent={(wppTotais?.taxaLeitura??0)>=50?"gold":"red"}/>
            </>)}
          </div>
          {!loadingWpp && wppCampanhas.length>0 && (
            <GlassCard>
              <SubTitle>Campanhas WPP — Detalhamento</SubTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campanha","Enviadas","Entregues","Lidas","% Leitura","Falhas","Status"].map(h=>(
                        <th key={h} className={cn("py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          h==="Campanha"?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wppCampanhas.map(c => {
                      const tl = c.entregues>0?(c.lidos/c.entregues)*100:0;
                      return (
                        <tr key={c.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="py-2 pr-3 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{c.total_envios.toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{c.entregues.toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-foreground">{c.lidos.toLocaleString("pt-BR")}</td>
                          <td className={cn("py-2 pr-3 text-right font-semibold",tl>=50?"text-emerald-400":tl>0?"text-amber-400":"text-muted-foreground/40")}>
                            {tl>0?pct(tl):"—"}</td>
                          <td className={cn("py-2 pr-3 text-right",c.falhas>0?"text-destructive":"text-muted-foreground/40")}>
                            {c.falhas>0?c.falhas:"—"}</td>
                          <td className="py-2 pr-3 text-right">
                            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-semibold",
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
          {!loadingWpp && wppCampanhas.length===0 && (
            <div className="text-center text-muted-foreground text-sm py-8">Nenhuma campanha WPP no período.</div>
          )}
        </div>
      )}

      {/* ── INSTAGRAM ── */}
      {tab==="instagram" && (
        <div className="space-y-4">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {igAccounts.map(acc => {
              const f = lastFollowers[acc]??0;
              const g = f - (firstFollowers[acc]??f);
              return <KPICard key={acc}
                title={acc==="eduardocristianoriginal"?"Seguidores EC":"Seguidores CS"}
                value={fmt(f)} subtitle={`${g>=0?"+":""}${fmt(g)} no período`} icon={Users}/>;
            })}
            <KPICard title="Posts no período" value={postsData.length}
              subtitle={`Eng. médio: ${fmt(igEngPost)}/post`} icon={TrendingUp}/>
            <KPICard title="Engajamento total" value={fmt(igEngTotal)}
              subtitle={`${fmt(postsData.length)} posts`} icon={Heart}/>
            <KPICard title="Taxa de engajamento" value={pct(igTaxaEng)}
              subtitle="eng ÷ alcance" icon={TrendingUp} accent="gold"/>
            <KPICard title="Views totais" value={fmt(igViews)}
              subtitle={`${fmt(igAlcance)} alcance`} icon={Eye}/>
          </div>

          {/* Seguidores ao longo do tempo */}
          {followersChart.length > 1 && (
            <GlassCard>
              <SubTitle>Crescimento de seguidores</SubTitle>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={followersChart}>
                  <defs>
                    <linearGradient id="igGradEC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={P}  stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={P}  stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="igGradCS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={P2} stopOpacity={0.5}/>
                      <stop offset="95%" stopColor={P2} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmt}/>
                  <Tooltip {...TT} formatter={(v:number) => fmt(v)}/>
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:MUTED}}/>
                  {igAccounts.map((acc,i) => (
                    <Area key={acc} type="monotone" dataKey={acc}
                      name={ACCOUNT_LABEL[acc]??acc}
                      stroke={i===0?P:P2} strokeWidth={2}
                      fill={i===0?"url(#igGradEC)":"url(#igGradCS)"} dot={false}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Linha 2: Frequência semanal + Melhor horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Frequência semanal vs engajamento */}
            {weeklyData.length > 0 && (
              <GlassCard>
                <SubTitle>Frequência semanal vs engajamento médio</SubTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} barGap={4} barCategoryGap="35%">
                    <XAxis dataKey="semana" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis yAxisId="left"  tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <Tooltip {...TT}/>
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:MUTED}}/>
                    <Bar yAxisId="left"  dataKey="posts"      name="Posts"    fill={P2} radius={[4,4,0,0]}/>
                    <Bar yAxisId="right" dataKey="engPorPost" name="Eng/post" fill={P}  radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            )}

            {/* Melhor horário */}
            {horarioData.length > 0 && (
              <GlassCard>
                <SubTitle>Melhor horário para postar</SubTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={horarioData} barCategoryGap="25%">
                    <XAxis dataKey="hora" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmt}/>
                    <Tooltip {...TT} formatter={(v:number) => [`${v}`, "Eng. médio"]}/>
                    <Bar dataKey="engMedio" name="Eng. médio" radius={[4,4,0,0]}>
                      {horarioData.map(d => {
                        const ratio = maxHorario > 0 ? d.engMedio/maxHorario : 0;
                        const op = Math.round(30 + ratio*220).toString(16).padStart(2,"0");
                        return <Cell key={d.hora} fill={`hsl(355 82% 51% / ${(0.3 + ratio*0.7).toFixed(2)})`}/>;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {horarioData.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Melhor horário: <span className="text-foreground font-semibold">
                      {horarioData.sort((a,b)=>b.engMedio-a.engMedio)[0].hora}
                    </span> — {fmt(Math.max(...horarioData.map(d=>d.engMedio)))} eng. médio
                  </p>
                )}
              </GlassCard>
            )}
          </div>

          {/* Linha 3: Performance por formato */}
          {porFormato.length > 0 && (
            <GlassCard>
              <SubTitle>Performance por formato de conteúdo</SubTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {porFormato.map(f => (
                  <div key={f.tipo} className="space-y-3">
                    {/* Header do formato */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{f.tipo}</span>
                      <span className="text-[10px] text-muted-foreground">{f.posts} post{f.posts!==1?"s":""}</span>
                    </div>
                    {/* Métricas */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Eng. por post</span>
                          <span className="text-foreground font-semibold">{fmt(f.engPorPost)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30">
                          <div className="h-1.5 rounded-full bg-primary transition-all"
                            style={{width:`${f.share}%`}}/>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Alcance por post</span>
                          <span className="text-foreground font-semibold">{fmt(f.alcancePorPost)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30">
                          <div className="h-1.5 rounded-full bg-primary/50 transition-all"
                            style={{width:`${Math.min(f.taxaEng*10,100)}%`}}/>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Taxa de engajamento</span>
                        <span className={cn("font-semibold", f.taxaEng>3?"text-emerald-400":"text-muted-foreground")}>
                          {pct(f.taxaEng)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Linha 4: Hashtags mais usadas */}
          {hashtagData.length > 0 && (
            <GlassCard>
              <SubTitle>Hashtags mais usadas</SubTitle>
              <div className="flex flex-wrap gap-2">
                {hashtagData.map(h => {
                  const max  = hashtagData[0].count;
                  const ratio = h.count/max;
                  return (
                    <span key={h.tag}
                      className={cn("px-2.5 py-1 rounded-full border transition-colors",
                        ratio>0.7?"text-xs":"text-[10px]")}
                      style={{
                        background: `hsl(355 82% 51% / ${(0.05+ratio*0.15).toFixed(2)})`,
                        borderColor: `hsl(355 82% 51% / ${(0.15+ratio*0.25).toFixed(2)})`,
                        color: `hsl(0 0% ${55+ratio*41}%)`,
                        fontWeight: ratio>0.5?600:400,
                      }}>
                      {h.tag}
                      <span className="ml-1 opacity-50 text-[9px]">×{h.count}</span>
                    </span>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Linha 5: Top posts */}
          {topPosts.length > 0 && (
            <GlassCard>
              <SubTitle>Top posts por engajamento</SubTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Conta","Data","Tipo","Caption","❤️","💬","🔁","Taxa eng.","Eng. total"].map(h=>(
                        <th key={h} className={cn("py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          ["Conta","Data","Tipo","Caption"].includes(h)?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map(p => (
                      <tr key={p.post_id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                        <td className="py-2 pr-3">
                          <span className="text-[10px] font-semibold text-primary">
                            {p.username==="eduardocristianoriginal"?"@EC":"@CS"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                          {p.posted_at.split("T")[0]}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 max-w-[160px]">
                          <span className="block truncate text-[10px] text-foreground/70" title={p.caption}>
                            {p.caption.slice(0,45)}{p.caption.length>45?"…":""}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.like_count)}</td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.comments_count)}</td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.shares)}</td>
                        <td className="py-2 pr-3 text-right">
                          <span className={cn("text-[10px] font-semibold",
                            p.taxaEng>3?"text-emerald-400":"text-muted-foreground")}>
                            {pct(p.taxaEng)}
                          </span>
                        </td>
                        <td className="py-2 text-right">
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

          {!loadingIG && postsData.length===0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Nenhum post encontrado no período selecionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline icon stubs para imports circulares
function CheckCheck(p:any){return<svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>;}
function Eye(p:any){return<svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>;}
function Send(p:any){return<svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>;}
