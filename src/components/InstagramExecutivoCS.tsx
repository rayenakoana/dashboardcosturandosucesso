import { useMemo, useRef, useState } from "react";
import {
  Instagram, Users, Eye, Heart, Link2, FileText, CalendarDays, Search,
  ExternalLink, Download, Play, Image as ImageIcon, Layers3,
  TrendingUp, TrendingDown, BarChart3, Clock3, AlertTriangle, Sparkles,
  ArrowRight, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronDown, X, Info, MousePointerClick, MessageCircle, Share2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import {
  useInstagramAccountDaily, useInstagramPostInsights, useInstagramProfileDaily,
  type InstagramPostInsight,
} from "@/hooks/useInstagramInsights";
import { MarketingSection } from "@/components/MarketingSection";
import "@/styles/csInstagramPrototipoFielV1.css";
import "@/styles/csInstagramPrototipoFielV2.css";

type Period = "7d" | "15d" | "30d" | "90d" | "custom";
type Account = "eduardocristianoriginal" | "costurandosucesso";
type AccountChoice = Account | "all";
type Format = "Reels" | "Imagem" | "Carrossel";
type PostOrder = "date" | "reach" | "engagement" | "rate" | "shares";
type Metric = "Alcance" | "Engajamento" | "Cliques";

interface Props {
  from: string;
  to: string;
  period: Period;
  onPeriod: (p: Period) => void;
  customStart: string;
  customEnd: string;
  onCustomStart: (v: string) => void;
  onCustomEnd: (v: string) => void;
}

const ACCS: { id: Account; label: string; short: string }[] = [
  { id: "eduardocristianoriginal", label: "@eduardocristianoriginal", short: "EC" },
  { id: "costurandosucesso", label: "@costurandosucesso", short: "CS" },
];
const COLORS = { total: "#f7304e", ec: "#f16f85", cs: "#7694fc", gain: "#12c79d", loss: "#f7304e" };
const num = (v: number) => (Number.isFinite(v) ? v : 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const compact = (v: number) => Number.isFinite(v) ? new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v) : "—";
const percent = (n: number) => Number.isFinite(n) ? `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : "—";
const day = (v: string) => v?.slice(0,10).split("-").reverse().join("/") || "—";
const labelDate = (v: string) => v?.slice(5, 10).split("-").reverse().join("/") || "";
const interaction = (p: InstagramPostInsight) => (p.like_count || 0) + (p.comments_count || 0) + (p.shares || 0) + (p.saved || 0);
const rate = (p: InstagramPostInsight) => p.reach > 0 ? 100 * interaction(p) / p.reach : 0;
const formatOf = (p: InstagramPostInsight): Format => p.media_type === "VIDEO" ? "Reels" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem";
const deltaPct = (current: number, before: number) => before > 0 ? 100 * (current-before)/before : null;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const tooltipStyle = { background: "#0b1823", border: "1px solid #26404c", borderRadius: 8, color: "#f3f7fa", fontSize: 11 };

interface Summary {
  first: number;
  last: number;
  gained: number;
  lost: number;
}
function accountStats(rows: Array<{ username: string; date: string; followers_count: number; followers_gained: number; followers_lost: number }>) {
  const result: Record<string, Summary> = {};
  for (const a of ACCS) {
    const r = rows.filter(x=>x.username === a.id).sort((a,b)=>a.date.localeCompare(b.date));
    result[a.id] = {
      first: r.length ? r[0].followers_count : 0,
      last: r.length ? r[r.length-1].followers_count : 0,
      gained: r.reduce((s,x)=>s+(x.followers_gained||0),0),
      lost: r.reduce((s,x)=>s+(x.followers_lost||0),0),
    };
  }
  return result;
}
function thumb(post: InstagramPostInsight, compactMode=false) {
  const T = post.media_type === "VIDEO" ? Play : post.media_type === "CAROUSEL_ALBUM" ? Layers3 : ImageIcon;
  // Se a sincronização do Instagram possuir uma URL de mídia real, usa essa URL.
  // Sem URL, preserva um placeholder — nunca atribui outra imagem ao post.
  const media = post as InstagramPostInsight;
  // cover_url (Storage permanente) tem prioridade; fallback para URLs do Meta CDN
  const candidate = media.cover_url || media.thumbnail_url || media.media_url || "";
  const realImage = /^https:\/\//i.test(candidate) ? candidate : null;
  return <span className={`cs-ig26__thumb ${compactMode ? "cs-ig26__thumb--mini" : ""}`} aria-label={formatOf(post)}>
    <T className="cs-ig26__thumb-fallback" size={compactMode?15:25}/>
    {!compactMode && <small>{formatOf(post)}</small>}
    {realImage && <img loading="lazy" alt={`Imagem real da publicação ${day(post.posted_at)}`} src={realImage}
      onError={e=>{e.currentTarget.style.display="none";}} />}
  </span>;
}
function Trend({ current, previous, unit = "%" }: {current:number;previous:number;unit?:string}) {
  // Taxa usa diferença em pontos percentuais; métricas volumétricas usam % relativo.
  const diff = unit === "p.p." ? current - previous : deltaPct(current,previous);
  if (diff === null || !Number.isFinite(diff) || (unit === "p.p." && previous === 0)) return <span className="cs-ig26__trend cs-ig26__trend--neutral">Sem base anterior</span>;
  return <span className={`cs-ig26__trend ${diff >= 0 ? "cs-ig26__trend--up":"cs-ig26__trend--down"}`}>
    {diff>=0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}{diff>0?"+":""}{diff.toLocaleString("pt-BR", {minimumFractionDigits: 1, maximumFractionDigits: 1})} {unit}
  </span>;
}

export function InstagramExecutivoCS({
  from, to, period, onPeriod, customStart, customEnd, onCustomStart, onCustomEnd,
}: Props) {
  const [account, setAccount] = useState<AccountChoice>("all");
  const [metric, setMetric] = useState<Metric>("Alcance");
  const [search, setSearch] = useState("");
  const [postFormat, setPostFormat] = useState<Format | "all">("all");
  const [postOrder, setPostOrder] = useState<PostOrder>("date");
  const [showAll, setShowAll] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: allPosts = [], isLoading: loadingPosts, isError: postsError } = useInstagramPostInsights(from,to);
  const { data: allDaily = [], isLoading: loadingDaily, isError: dailyError } = useInstagramAccountDaily(from,to);
  const { data: allProfile = [], isLoading: loadingProfile, isError: profileError } = useInstagramProfileDaily(from,to);
  const prev = useMemo(() => {
    const a = new Date(from+"T12:00:00Z");
    const b = new Date(to+"T12:00:00Z");
    const d = Math.max(1,Math.round((b.getTime()-a.getTime())/86400000)+1);
    const start = new Date(a);start.setUTCDate(start.getUTCDate()-d);
    const end = new Date(a);end.setUTCDate(end.getUTCDate()-1);
    return {from:iso(start),to:iso(end)};
  },[from,to]);
  const {data: prevPosts=[]} = useInstagramPostInsights(prev.from,prev.to);
  const {data: prevProfile=[]} = useInstagramProfileDaily(prev.from,prev.to);

  const posts = useMemo(()=>allPosts.filter(p=>account==="all" || p.username===account),[allPosts,account]);
  const daily = useMemo(()=>allDaily.filter(d=>account==="all" || d.username===account),[allDaily,account]);
  const profiles = useMemo(()=>allProfile.filter(d=>account==="all" || d.username===account),[allProfile,account]);
  const previousPosts = useMemo(()=>prevPosts.filter(p=>account==="all" || p.username===account),[prevPosts,account]);
  const previousProfile = useMemo(()=>prevProfile.filter(d=>account==="all" || d.username===account),[prevProfile,account]);
  const followers = useMemo(()=>accountStats(allDaily),[allDaily]);
  const totals = useMemo(()=>{
    const selected = account==="all" ? ACCS.map(a=>a.id) : [account];
    const f = selected.reduce((s,id)=>s+followers[id].last,0);
    const net = selected.reduce((s,id)=>s+followers[id].last-followers[id].first,0);
    const gains = selected.reduce((s,id)=>s+followers[id].gained,0);
    const losses = selected.reduce((s,id)=>s+followers[id].lost,0);
    const reach = posts.reduce((s,p)=>s+(p.reach||0),0);
    const eng = posts.reduce((s,p)=>s+interaction(p),0);
    const clicks = profiles.reduce((s,p)=>s+(p.website_clicks||0),0);
    return {followers:f,net,gains,losses,reach,eng,clicks,count:posts.length, rate:reach>0 ? 100*eng/reach:0};
  },[account,followers,posts,profiles]);
  const past = useMemo(()=>({
    reach:previousPosts.reduce((s,p)=>s+(p.reach||0),0),
    eng:previousPosts.reduce((s,p)=>s+interaction(p),0),
    clicks:previousProfile.reduce((s,p)=>s+(p.website_clicks||0),0),
    count:previousPosts.length,
  }),[previousPosts,previousProfile]);

  const followerSeries = useMemo(()=>{
    const map = new Map<string,Record<string,number|string|null>>();
    allDaily.forEach(r=>{
      if(!map.has(r.date))map.set(r.date,{date:r.date,ec:null,cs:null,total:null});
      const obj=map.get(r.date)!;
      if(r.username===ACCS[0].id)obj.ec=r.followers_count;
      if(r.username===ACCS[1].id)obj.cs=r.followers_count;
    });
    return [...map.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(x=>({
      ...x,
      total:typeof x.ec==="number"&&typeof x.cs==="number"?x.ec+x.cs:null,
    }));
  },[allDaily]);
  const gainSeries = useMemo(()=>{
    const m = new Map<string,{date:string;gains:number;losses:number;balance:number}>();
    daily.forEach(d=>{
      if(!m.has(d.date))m.set(d.date,{date:d.date,gains:0,losses:0,balance:0});
      const row=m.get(d.date)!;row.gains+=d.followers_gained||0;row.losses+=d.followers_lost||0;
      row.balance=row.gains-row.losses;
    });
    return [...m.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({...x,lossesBar:-x.losses}));
  },[daily]);
  const formatRows = useMemo(()=>{
    const map = new Map<Format,{label:Format;reach:number;eng:number;posts:number;shares:number;saved:number}>();
    posts.forEach(p=>{
      const key=formatOf(p);
      if(!map.has(key))map.set(key,{label:key,reach:0,eng:0,posts:0,shares:0,saved:0});
      const x=map.get(key)!;x.reach+=(p.reach||0);x.eng+=interaction(p);x.posts++;x.shares+=(p.shares||0);x.saved+=(p.saved||0);
    });
    return [...map.values()].sort((a,b)=>["Reels","Imagem","Carrossel"].indexOf(a.label)-["Reels","Imagem","Carrossel"].indexOf(b.label));
  },[posts]);
  const weeks = useMemo(()=>{
    const m = new Map<string,{week:string;posts:number;eng:number}>();
    posts.forEach(p=>{
      const d=new Date(p.posted_at);const diff=d.getUTCDay();d.setUTCDate(d.getUTCDate()-diff);
      const w=iso(d);if(!m.has(w))m.set(w,{week:w,posts:0,eng:0});
      const x=m.get(w)!;x.posts++;x.eng+=interaction(p);
    });
    return [...m.values()].sort((a,b)=>a.week.localeCompare(b.week)).map((v,i)=>({name:`Sem ${i+1}`,...v,engAvg:v.posts?v.eng/v.posts:0}));
  },[posts]);
  const hours = useMemo(()=>{
    const m = new Map<number,{hour:number;total:number;posts:number}>();
    posts.forEach(p=>{
      const h=new Date(p.posted_at).getHours();if(!m.has(h))m.set(h,{hour:h,total:0,posts:0});
      const x=m.get(h)!;x.total+=interaction(p);x.posts++;
    });
    return [...m.values()].sort((a,b)=>a.hour-b.hour).map(x=>({...x,label:`${String(x.hour).padStart(2,"0")}h`,avg:x.total/x.posts}));
  },[posts]);
  const bestHour = hours.length ? [...hours].sort((a,b)=>b.avg-a.avg)[0] : null;
  const sortedEngagement = useMemo(()=>[...posts].filter(p=>p.reach>0).sort((a,b)=>rate(b)-rate(a)),[posts]);
  const topReach = useMemo(()=>[...posts].sort((a,b)=>b.reach-a.reach)[0], [posts]);
  const topER = sortedEngagement[0];
  const impacts = useMemo(()=>posts.map(p=>{
    const date=p.posted_at.slice(0,10);
    const min=new Date(date+"T12:00:00Z");const max=new Date(min);max.setUTCDate(max.getUTCDate()+2);
    const maxIso=iso(max);
    const nearby=allDaily.filter(d=>d.username===p.username && d.date>date && d.date<=maxIso);
    return {post:p,net:nearby.reduce((s,d)=>s+(d.followers_gained||0)-(d.followers_lost||0),0),hasData:nearby.length>0};
  }),[posts,allDaily]);
  const topImpact = useMemo(()=>impacts.filter(x=>x.hasData).sort((a,b)=>b.net-a.net)[0],[impacts]);
  const topShared = useMemo(()=>[...posts].sort((a,b)=>(b.shares||0)-(a.shares||0))[0],[posts]);
  const counts7 = useMemo(()=>{
    const end = new Date(to+"T12:00:00Z");
    const recentStart=new Date(end);recentStart.setUTCDate(recentStart.getUTCDate()-6);
    const priorStart=new Date(recentStart);priorStart.setUTCDate(priorStart.getUTCDate()-7);
    const priorEnd=new Date(recentStart);priorEnd.setUTCDate(priorEnd.getUTCDate()-1);
    const recent=posts.filter(p=>p.posted_at.slice(0,10)>=iso(recentStart)&&p.posted_at.slice(0,10)<=to);
    const before=posts.filter(p=>p.posted_at.slice(0,10)>=iso(priorStart)&&p.posted_at.slice(0,10)<=iso(priorEnd));
    const reels=x=>x.filter(p=>formatOf(p)==="Reels");
    const er=x=>{const reach=x.reduce((s,p)=>s+p.reach,0);return reach>0?100*x.reduce((s,p)=>s+interaction(p),0)/reach:null;};
    return {recent:recent.length,before:before.length,reelRecent:er(reels(recent)),reelBefore:er(reels(before))};
  },[posts,to]);

  const displayedPosts = useMemo(()=>{
    const q=search.trim().toLocaleLowerCase("pt-BR");
    const rows=posts.filter(p=>(postFormat==="all"||formatOf(p)===postFormat)&&(!q||p.caption?.toLocaleLowerCase("pt-BR").includes(q)||p.username.toLowerCase().includes(q)));
    rows.sort((a,b)=>{
      const v=postOrder==="reach"?b.reach-a.reach:postOrder==="engagement"?interaction(b)-interaction(a):postOrder==="rate"?rate(b)-rate(a):postOrder==="shares"?b.shares-a.shares:new Date(b.posted_at).getTime()-new Date(a.posted_at).getTime();
      return v;
    });
    return showAll?rows:rows.slice(0,10);
  },[posts,postFormat,postOrder,search,showAll]);
  const filteredPostCount=posts.filter(p=>(postFormat==="all"||formatOf(p)===postFormat)&&(!search.trim()||(p.caption||"").toLowerCase().includes(search.trim().toLowerCase())||p.username.toLowerCase().includes(search.trim().toLowerCase()))).length;

  function jumpToPosts(order:PostOrder = "date") { setPostOrder(order);setShowAll(true);tableRef.current?.scrollIntoView({behavior:"smooth",block:"start"}); }
  function exportCsv() {
    const quote=(v:unknown)=>{
      let t=String(v??"");
      if(/^[=+@\-]/.test(t))t="'"+t;
      return '"'+t.replace(/"/g,'""')+'"';
    };
    const header=["Data","Conta","Tipo","Legenda","Alcance","Engajamentos","Engajamento %","Curtidas","Comentarios","Compartilhamentos","Salvamentos","Visualizacoes","Link"];
    const rows=posts.filter(p=>(postFormat==="all"||formatOf(p)===postFormat)&&(!search.trim()||(p.caption||"").toLowerCase().includes(search.trim().toLowerCase())||p.username.toLowerCase().includes(search.trim().toLowerCase()))).map(p=>[
      p.posted_at.slice(0,10),p.username,formatOf(p),p.caption,p.reach,interaction(p),rate(p).toFixed(2),p.like_count,p.comments_count,p.shares,p.saved,p.views,p.permalink,
    ]);
    const csv="\ufeff"+[header,...rows].map(r=>r.map(quote).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
    const a=document.createElement("a");a.href=url;a.download=`instagram-csdash-${from}-${to}.csv`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  const selectedIsEC=account==="eduardocristianoriginal";
  const accountsShown=account==="all"?ACCS:ACCS.filter(a=>a.id===account);
  const highlights:[string,InstagramPostInsight|undefined,string,string][]=[
    ["Melhor post (alcance)",topReach,topReach?compact(topReach.reach):"—","alcance"],
    ["Maior engajamento",topER,topER?percent(rate(topER)):"—","taxa de engajamento"],
    ["Maior crescimento após post",topImpact?.post,topImpact?`${topImpact.net>=0?"+":""}${num(topImpact.net)}`:"—","saldo nos 2 dias seguintes"],
  ];
  const lastDate = [...allDaily].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date;
  const loading=loadingPosts||loadingDaily||loadingProfile;

  return <div className="cs-ig26">
    <div className="cs-ig26__intro">
      <p>Acompanhe o desempenho de conteúdo, audiência e engajamento no Instagram.</p>
      {lastDate && <small>Último snapshot de seguidores: {day(lastDate)}</small>}
    </div>
    <div className="cs-ig26__filters">
      <div className="cs-ig26__accounts" role="group" aria-label="Selecionar conta do Instagram">
        <button type="button" className={account==="all"?"selected":""} onClick={()=>setAccount("all")}><Instagram size={16}/> Todas as contas</button>
        {ACCS.map(a=><button type="button" key={a.id} className={account===a.id?"selected":""} onClick={()=>setAccount(a.id)}><span className={`cs-ig26__avatar cs-ig26__avatar--${a.short.toLowerCase()}`}>{a.short}</span><span><strong>@{a.short}</strong><small>{compact(followers[a.id].last)} seguidores</small></span></button>)}
      </div>
      <div className="cs-ig26__dates">
        <span className="cs-ig26__date-label"><CalendarDays size={14}/>{day(from)} - {day(to)}</span>
        <div className="cs-ig26__periods" aria-label="Selecionar período">
          {(["7d","30d","90d","custom"] as Period[]).map(x=><button type="button" key={x} className={period===x?"selected":""} onClick={()=>onPeriod(x)}>{x==="custom"?"Personalizado":x.replace("d","d")}</button>)}
        </div>
        {period==="custom" && <div className="cs-ig26__custom"><input type="date" aria-label="Data inicial" value={customStart} onChange={e=>onCustomStart(e.target.value)}/><span>até</span><input type="date" aria-label="Data final" value={customEnd} onChange={e=>onCustomEnd(e.target.value)}/></div>}
      </div>
    </div>
    {(postsError||dailyError||profileError) && <div role="alert" className="cs-ig26__warning">Falha ao consultar parte dos dados do Instagram. Confira a sincronização antes de interpretar os indicadores.</div>}
    <section className="cs-ig26__panel cs-ig26__summary">
      <div className="cs-ig26__panel-heading"><h2>RESUMO DO PERÍODO</h2><span>vs. período anterior: {day(prev.from)} - {day(prev.to)}</span></div>
      <div className="cs-ig26__kpis">
        {[
          {name:"Seguidores",value:compact(totals.followers),detail:`${totals.net>=0?"+":""}${num(totals.net)} líquidos`,Icon:Users,comp:<span className={totals.net>=0?"cs-ig26__pos":"cs-ig26__neg"}>{totals.net>=0?"↑":"↓"} saldo no período</span>},
          {name:"Alcance dos posts",value:compact(totals.reach),detail:"alcance somado",Icon:Eye,comp:<Trend current={totals.reach} previous={past.reach}/>},
          {name:"Engajamentos",value:compact(totals.eng),detail:`${percent(totals.rate)} de taxa`,Icon:Heart,comp:<Trend current={totals.eng} previous={past.eng}/>},
          {name:"Cliques no link",value:num(totals.clicks),detail:"cliques no perfil",Icon:Link2,comp:<Trend current={totals.clicks} previous={past.clicks}/>},
          {name:"Posts publicados",value:num(totals.count),detail:"publicações no período",Icon:FileText,comp:<Trend current={totals.count} previous={past.count}/>},
        ].map(({name,value,detail,Icon,comp})=><div className="cs-ig26__kpi" key={name}><span className="cs-ig26__kpi-icon"><Icon size={24}/></span><div><b>{loading?"—":value}</b><span>{name}</span><small>{detail}</small><div>{comp}</div></div></div>)}
      </div>
    </section>
    <section className="cs-ig26__panel cs-ig26__accounts-panel">
      <div className="cs-ig26__panel-heading"><h2>DESEMPENHO POR CONTA</h2></div>
      <div className="cs-ig26__account-grid">
        {accountsShown.map(a=>{
          const f=followers[a.id];const groupPosts=allPosts.filter(p=>p.username===a.id);const reach=groupPosts.reduce((s,p)=>s+p.reach,0);const eng=groupPosts.reduce((s,p)=>s+interaction(p),0);
          const net=f.last-f.first;
          const prevGroup = prevPosts.filter(p=>p.username===a.id);
          const prevReach = prevGroup.reduce((sum,p)=>sum+(p.reach||0),0);
          const prevEng = prevGroup.reduce((sum,p)=>sum+interaction(p),0);
          const avg = groupPosts.length ? reach / groupPosts.length : 0;
          const prevAvg = prevGroup.length ? prevReach / prevGroup.length : 0;
          const prevRate = prevReach > 0 ? 100 * prevEng / prevReach : 0;
          const currentRate = reach > 0 ? 100 * eng / reach : 0;
          return <article className="cs-ig26__account" key={a.id}>
            <div className="cs-ig26__account-title"><span className={`cs-ig26__avatar cs-ig26__avatar--${a.short.toLowerCase()}`}>{a.short}</span><div><strong>{a.label}</strong><small>{num(f.last)} seguidores</small></div><em>{a.short}</em></div>
            <div className="cs-ig26__account-metrics">
              <div><b className={net>=0?"cs-ig26__pos":"cs-ig26__neg"}>{net>=0?"+":""}{num(net)}</b><small>seguidores líquidos</small><span>{num(f.gained)} ganhos · {num(f.lost)} perdas</span></div>
              <div><b>{groupPosts.length?compact(avg):"—"}</b><small>alcance médio</small><Trend current={avg} previous={prevAvg}/></div>
              <div><b>{reach?percent(currentRate):"—"}</b><small>taxa de engajamento</small><Trend current={currentRate} previous={prevRate} unit="p.p."/></div>
              <div><b>{num(groupPosts.length)}</b><small>posts no período</small><Trend current={groupPosts.length} previous={prevGroup.length}/></div>
            </div>
          </article>;
        })}
      </div>
    </section>
    <section className="cs-ig26__panel">
      <div className="cs-ig26__panel-heading"><h2>DESTAQUES DO PERÍODO</h2></div>
      <div className="cs-ig26__highlights">
        {highlights.map(([title,p,value,label])=><article className="cs-ig26__highlight" key={title}>
          <h3>{title}</h3>
          {p?<>
            <div className="cs-ig26__highlight-content">{thumb(p)}<div><b>{value}</b><small>{label}</small><p title={p.caption}>{p.caption?.slice(0,76)||"Publicação sem legenda"}</p><span className="cs-ig26__post-meta"><em>{formatOf(p)}</em> {day(p.posted_at)}</span><div className="cs-ig26__highlight-actions"><a href={p.permalink} target="_blank" rel="noopener noreferrer">Ver post <ExternalLink size={12}/></a></div></div></div>
            <div className="cs-ig26__highlight-stats" aria-label="Interações desta publicação">
              <span title="Curtidas"><Heart size={14}/>{compact(p.like_count)}</span>
              <span title="Comentários"><MessageCircle size={14}/>{compact(p.comments_count)}</span>
              <span title="Visualizações"><Play size={14}/>{compact(p.views)}</span>
              <span title="Compartilhamentos"><Share2 size={14}/>{compact(p.shares)}</span>
            </div>
          </>:<p className="cs-ig26__empty">Sem dados neste período</p>}
        </article>)}
        <article className="cs-ig26__highlight cs-ig26__highlight--hour">
          <h3>Melhor horário</h3><span className="cs-ig26__clock"><Clock3 size={27}/></span>
          <b>{bestHour?.label??"—"}</b><small>engajamento médio</small>
          <div className="cs-ig26__hour-bars">{hours.slice(0,7).map(h=><span key={h.hour} className={bestHour?.hour===h.hour?"best":""} style={{height:`${Math.max(7,bestHour?72*h.avg/bestHour.avg:0)}px`}} title={`${h.label}: ${num(h.avg)} eng. médio`}/>)}</div>
          <div className="cs-ig26__hour-labels">{hours.slice(0,7).map(h=><span key={h.hour} className={bestHour?.hour===h.hour?"best":""}>{h.label}</span>)}</div>
          <p>{bestHour?`${num(bestHour.avg)} interações/post · base: ${bestHour.posts} post(s)`:"Sem publicações"}</p>
        </article>
      </div>
    </section>
    <div className="cs-ig26__charts-two">
      <section className="cs-ig26__panel cs-ig26__chart"><div className="cs-ig26__panel-heading"><h2>CRESCIMENTO DE SEGUIDORES</h2><span>Snapshots diários</span></div>
        {followerSeries.length>1?<><div className="cs-ig26__legend"><span><i style={{background:COLORS.total}}/> Total</span><span><i style={{background:COLORS.ec}}/> @EC</span><span><i style={{background:COLORS.cs}}/> @CS</span></div>
          <ResponsiveContainer width="100%" height={265}><AreaChart data={followerSeries} margin={{top:10,left:0,right:8,bottom:0}}><defs>
            <linearGradient id="ig26FollowerFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.total} stopOpacity={0.35}/><stop offset="100%" stopColor={COLORS.total} stopOpacity={0.02}/></linearGradient>
          </defs><CartesianGrid stroke="#20343c" strokeOpacity={0.65} vertical={true}/><XAxis dataKey="date" tickFormatter={labelDate} tick={{fill:"#8c9ca5",fontSize:12}} axisLine={false} tickLine={false} minTickGap={20}/><YAxis yAxisId="followers" tickFormatter={compact} tick={{fill:"#8c9ca5",fontSize:12}} axisLine={false} tickLine={false} width={48} domain={["dataMin - 1500", "dataMax + 1500"]}/><YAxis yAxisId="cs" hide orientation="right" domain={["dataMin - 200", "dataMax + 200"]}/><Tooltip contentStyle={tooltipStyle} labelFormatter={v=>day(String(v))} formatter={v=>num(Number(v))}/>
            {(account==="all")&&<Area yAxisId="followers" dataKey="total" name="Total" stroke={COLORS.total} strokeWidth={2.2} fill="url(#ig26FollowerFill)" dot={false} connectNulls={false} />}
            {(account==="all"||selectedIsEC)&&<Area yAxisId="followers" dataKey="ec" name="@EC" stroke={COLORS.ec} strokeWidth={1.7} fillOpacity={0} fill="transparent" dot={false} connectNulls={false} />}
            {(account==="all"||!selectedIsEC)&&<Area yAxisId="cs" dataKey="cs" name="@CS (escala própria)" stroke={COLORS.cs} strokeWidth={1.7} fillOpacity={0} fill="transparent" dot={false} connectNulls={false} />}
          </AreaChart></ResponsiveContainer><p className="cs-ig26__scale-note">@CS utiliza eixo próprio para manter visível a evolução das duas contas, com bases de seguidores diferentes.</p></>:<p className="cs-ig26__chart-empty">Histórico diário insuficiente para o gráfico.</p>}
      </section>
      <section className="cs-ig26__panel cs-ig26__chart"><div className="cs-ig26__panel-heading"><h2>GANHOS E PERDAS DE SEGUIDORES</h2><span>Por dia</span></div>
        <div className="cs-ig26__gains-layout"><div className="cs-ig26__gains-chart">
        {gainSeries.length?<><div className="cs-ig26__legend"><span><i style={{background:COLORS.gain}}/>Ganhos</span><span><i style={{background:COLORS.loss}}/>Perdas</span><span><i style={{background:"#f2f5f7"}}/>Saldo</span></div>
          <ResponsiveContainer width="100%" height={265}><ComposedChart data={gainSeries} margin={{left:0,right:0,top:10,bottom:0}}><CartesianGrid stroke="#20343c" strokeOpacity={0.65}/><XAxis dataKey="date" tickFormatter={labelDate} tick={{fill:"#8c9ca5",fontSize:12}} tickLine={false} axisLine={false} minTickGap={17}/><YAxis tick={{fill:"#8c9ca5",fontSize:10}} tickLine={false} axisLine={false} width={34}/><Tooltip contentStyle={tooltipStyle} labelFormatter={v=>day(String(v))}/><Bar name="Ganhos" dataKey="gains" fill={COLORS.gain} maxBarSize={11}/><Bar name="Perdas" dataKey="lossesBar" fill={COLORS.loss} maxBarSize={11}/><Line name="Saldo" type="monotone" dataKey="balance" stroke="#f2f5f7" strokeWidth={1.5} dot={false}/></ComposedChart></ResponsiveContainer></>:<p className="cs-ig26__chart-empty">Sem histórico de ganhos e perdas.</p>}
        </div><aside className="cs-ig26__gain-totals"><small>TOTAL NO PERÍODO</small><b className="cs-ig26__pos">+{num(totals.gains)}</b><span>ganhos</span><b className="cs-ig26__neg">-{num(totals.losses)}</b><span>perdas</span><b>{totals.net>=0?"+":""}{num(totals.net)}</b><span>saldo (snapshots)</span></aside></div>
      </section>
    </div>
    <div className="cs-ig26__charts-three">
      <section className="cs-ig26__panel cs-ig26__chart"><div className="cs-ig26__panel-heading"><h2>PERFORMANCE POR FORMATO</h2></div>
        <div className="cs-ig26__metric-tabs">{(["Alcance","Engajamento","Cliques"] as Metric[]).map(x=><button key={x} type="button" onClick={()=>setMetric(x)} className={metric===x?"selected":""}>{x}</button>)}</div>
        {metric==="Cliques"?<p className="cs-ig26__chart-empty">A integração atual informa cliques no link por conta, não por formato de post.</p>:formatRows.length?formatRows.map(f=>{
          const score=metric==="Alcance"?(f.posts?f.reach/f.posts:0):(f.posts?f.eng/f.posts:0);
          const max=Math.max(...formatRows.map(v=>metric==="Alcance"?v.reach/v.posts:v.eng/v.posts),1);
          return <div className="cs-ig26__format-row" key={f.label}><span>{f.label}</span><div className="cs-ig26__format-bar"><i style={{width:`${score/max*100}%`}}/></div><b>{metric==="Alcance"?compact(score):compact(score)}</b><small>{percent(f.reach>0?100*f.eng/f.reach:0)} eng.</small></div>;
        }):<p className="cs-ig26__chart-empty">Sem posts no período.</p>}
      </section>
      <section className="cs-ig26__panel cs-ig26__chart"><div className="cs-ig26__panel-heading"><h2>FREQUÊNCIA × ENGAJAMENTO</h2></div>
        {weeks.length?<ResponsiveContainer width="100%" height={235}><BarChart data={weeks} margin={{left:0,right:10,top:15}}><CartesianGrid stroke="#20343c"/><XAxis dataKey="name" tick={{fill:"#9cacb5",fontSize:10}} tickLine={false} axisLine={false}/><YAxis yAxisId="posts" tick={{fill:"#9cacb5",fontSize:10}} width={25} tickLine={false} axisLine={false} allowDecimals={false}/><YAxis yAxisId="eng" orientation="right" tickFormatter={compact} tick={{fill:"#9cacb5",fontSize:10}} width={40} tickLine={false} axisLine={false}/><Tooltip contentStyle={tooltipStyle}/><Legend iconSize={7} wrapperStyle={{fontSize:10}}/><Bar yAxisId="posts" dataKey="posts" name="Posts" fill={COLORS.total} barSize={25} radius={[3,3,0,0]}/><Line yAxisId="eng" dataKey="engAvg" name="Eng. médio" type="monotone" stroke={COLORS.ec} strokeWidth={2} dot={{r:3}}/></BarChart></ResponsiveContainer>:<p className="cs-ig26__chart-empty">Sem dados de frequência.</p>}
      </section>
      <section className="cs-ig26__panel cs-ig26__chart"><div className="cs-ig26__panel-heading"><h2>MELHOR HORÁRIO PARA POSTAR</h2></div>
        {hours.length?<><ResponsiveContainer width="100%" height={220}><BarChart data={hours} margin={{left:0,right:2,top:10,bottom:0}}><CartesianGrid stroke="#20343c"/><XAxis dataKey="label" tick={{fill:"#9cacb5",fontSize:10}} tickLine={false} axisLine={false}/><YAxis tickFormatter={compact} tick={{fill:"#9cacb5",fontSize:10}} tickLine={false} axisLine={false} width={35}/><Tooltip contentStyle={tooltipStyle} formatter={v=>[num(Number(v)),"Engajamentos/post"]}/><Bar dataKey="avg" name="Eng. médio" radius={[2,2,0,0]} maxBarSize={24}>{hours.map(h=><Cell key={h.hour} fill={h.hour===bestHour?.hour?COLORS.total:"#8e2c3d"}/>)}</Bar></BarChart></ResponsiveContainer><p className="cs-ig26__chart-note">Melhor horário: <b>{bestHour?.label}</b> — {compact(bestHour?.avg??0)} eng. médio · {bestHour?.posts} post(s)</p></>:<p className="cs-ig26__chart-empty">Sem dados de horários.</p>}
      </section>
    </div>
    <section className="cs-ig26__panel cs-ig26__intelligence"><div className="cs-ig26__panel-heading"><div><h2>INTELIGÊNCIA DE CONTEÚDO</h2><p>Leituras calculadas com base nos dados disponíveis do período.</p></div><button type="button" onClick={()=>jumpToPosts()}>Ver todos <ArrowRight size={14}/></button></div>
      <div className="cs-ig26__insight-grid">
        <article className="cs-ig26__insight cs-ig26__insight--green"><small><Sparkles size={15}/> OPORTUNIDADE</small><h3>{bestHour?`Publicações às ${bestHour.label}`:"Horários a analisar"}</h3><p>{bestHour?`Tiveram ${compact(bestHour.avg)} interações médias neste período.`:"Ainda não há posts suficientes para comparar horários."}</p><footer>Base: {bestHour?.posts??0} publicação(ões) <button type="button" onClick={()=>jumpToPosts("engagement")}>Ver posts <ArrowRight size={12}/></button></footer></article>
        <article className="cs-ig26__insight cs-ig26__insight--green"><small><Sparkles size={15}/> CONTEÚDO PARA REPLICAR</small><h3>{topShared?"Post mais compartilhado":"Compartilhamentos"}</h3><p>{topShared?`${num(topShared.shares)} compartilhamentos · ${topShared.caption?.slice(0,56)||"sem legenda"}`:"Não há dados suficientes de compartilhamentos."}</p><footer>{topShared?formatOf(topShared):"Sem base"}<button type="button" onClick={()=>jumpToPosts("shares")}>Ver posts <ArrowRight size={12}/></button></footer></article>
        <article className="cs-ig26__insight cs-ig26__insight--amber"><small><AlertTriangle size={15}/> ATENÇÃO</small><h3>{counts7.before>0&&counts7.recent<counts7.before?"Frequência em queda":"Frequência de publicações"}</h3><p>{counts7.before>0?`${counts7.before} posts nos 7 dias anteriores e ${counts7.recent} nos últimos 7 dias.`:"Sem histórico comparável de duas semanas completas."}</p><footer>Comparação dos últimos 14 dias <button type="button" onClick={()=>jumpToPosts()}>Ver posts <ArrowRight size={12}/></button></footer></article>
        <article className="cs-ig26__insight cs-ig26__insight--red"><small><AlertTriangle size={15}/> PONTO DE ATENÇÃO</small><h3>Engajamento dos Reels</h3><p>{counts7.reelBefore!==null&&counts7.reelRecent!==null?`${percent(counts7.reelBefore)} nos 7 dias anteriores → ${percent(counts7.reelRecent)} nos últimos 7 dias.`:"Dados insuficientes para comparação semanal de Reels."}</p><footer>Base: interações / alcance <button type="button" onClick={()=>{setPostFormat("Reels");jumpToPosts("rate")}}>Ver detalhes <ArrowRight size={12}/></button></footer></article>
      </div>
    </section>
    <section className="cs-ig26__panel cs-ig26__posts" ref={tableRef}>
      <div className="cs-ig26__panel-heading"><h2>POSTS DO PERÍODO ({filteredPostCount})</h2>
        <div className="cs-ig26__table-filters"><label className="cs-ig26__search"><Search size={14}/><input value={search} onChange={e=>{setSearch(e.target.value);setShowAll(false)}} placeholder="Buscar por legenda..." aria-label="Buscar posts por legenda"/></label>
          <select value={postFormat} onChange={e=>{setPostFormat(e.target.value as Format|"all");setShowAll(false)}} aria-label="Filtrar por formato"><option value="all">Todos os formatos</option><option value="Reels">Reels</option><option value="Imagem">Imagem</option><option value="Carrossel">Carrossel</option></select>
          <select disabled value="" aria-label="Objetivo indisponível" title="O sistema atual não recebe o objetivo de cada publicação"><option value="">Objetivo não disponível</option></select>
          <select value={account} onChange={e=>setAccount(e.target.value as AccountChoice)} aria-label="Filtrar por conta"><option value="all">Todas as contas</option><option value="eduardocristianoriginal">@EC</option><option value="costurandosucesso">@CS</option></select>
          <button type="button" onClick={exportCsv}><Download size={14}/> Baixar CSV</button></div>
      </div>
      <div className="cs-ig26__table-scroll"><table><thead><tr>
        <th>DATA</th><th>CONTA</th><th>TIPO</th><th>CAPTION</th><th>OBJETIVO</th><th>ALCANCE</th><th>ENG.</th><th>ENG. %</th><th>CLIQUE</th><th>SEGUIDORES</th><th>AÇÃO</th>
      </tr></thead><tbody>
        {displayedPosts.map(p=><tr key={p.post_id}><td className="cs-ig26__cell-date">{day(p.posted_at)}</td><td>@{p.username===ACCS[0].id?"EC":"CS"}</td><td><span className="cs-ig26__kind">{formatOf(p)}</span></td><td className="cs-ig26__caption"><div>{thumb(p,true)}<span title={p.caption}>{p.caption?.slice(0,58)||"Sem legenda"}</span></div></td><td className="cs-ig26__na" title="Objetivo da publicação não disponibilizado">—</td><td>{compact(p.reach)}</td><td>{compact(interaction(p))}</td><td className={rate(p)>=5?"cs-ig26__pos":""}>{percent(rate(p))}</td><td className="cs-ig26__na" title="Cliques não disponíveis por publicação">—</td><td className="cs-ig26__na" title="Atribuição de novos seguidores a cada post não está disponível">—</td><td><a href={p.permalink} target="_blank" rel="noopener noreferrer">Ver <ExternalLink size={11}/></a></td></tr>)}
        {!displayedPosts.length&&<tr><td colSpan={11} className="cs-ig26__empty">{loading?"Carregando...":"Nenhum post encontrado para os filtros selecionados."}</td></tr>}
      </tbody></table></div>
      {filteredPostCount>10&&<button type="button" className="cs-ig26__more" onClick={()=>setShowAll(v=>!v)}>{showAll?"Mostrar somente 10 posts":`Ver todos os ${filteredPostCount} posts`} <ChevronDown size={14}/></button>}
      <p className="cs-ig26__posts-note"><Info size={13}/> Métricas reais disponíveis na integração: cliques no link são agregados por conta e objetivos por publicação não são fornecidos.</p>
    </section>
    <div className="cs-ig26__extras"><button type="button" onClick={()=>setShowMore(v=>!v)}><BarChart3 size={16}/>{showMore?"Ocultar análises complementares":"Abrir análises complementares (impacto de conteúdo, alertas e IA)"}<ChevronDown size={15}/></button>
      {showMore&&<div className="cs-ig26__extras-content"><MarketingSection from={from} to={to}/></div>}
    </div>
  </div>;
}
