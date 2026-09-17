import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetaAdsInsights } from "@/hooks/useMetaAdsInsights";
import { useWppCampanhasResumo } from "@/hooks/useWppCampanhasResumo";
import { useInstagramPostInsights, useInstagramAccountDaily } from "@/hooks/useInstagramInsights";
import {
  TrendingUp, Megaphone, MessageCircle, DollarSign,
  Users, BarChart2, Send, CheckCheck, Eye, Instagram,
  ExternalLink, Share2, Heart,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";
import { cn } from "@/lib/utils";

const tooltipStyle = {
  background: "#111",
  border: "1px solid hsl(0 0% 12%)",
  borderRadius: "8px",
  fontSize: 12,
};

type Tab = "meta" | "wpp" | "instagram";

interface Props { from: string; to: string; }

function StatBox({ label, value, icon: Icon, sub, highlight = false }: {
  label: string; value: string | number; icon: any; sub?: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border p-4 flex flex-col gap-1 bg-card/50 backdrop-blur-sm",
      highlight && "border-primary/30 bg-primary/5"
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <span className="font-display font-bold text-2xl tracking-wide text-foreground leading-none">{value}</span>
      {sub && <span className="text-[11px] text-muted-foreground mt-0.5">{sub}</span>}
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

const ACCOUNT_COLORS: Record<string, string> = {
  eduardocristianoriginal: "#e11d48",
  costurandosucesso: "#0ea5e9",
};

export function MarketingSection({ from, to }: Props) {
  const [tab, setTab] = useState<Tab>("meta");

  const { data: metaData = [], isLoading: loadingMeta } = useMetaAdsInsights(from, to);
  const { data: wppData, isLoading: loadingWpp } = useWppCampanhasResumo(from, to);
  const { data: postsData = [], isLoading: loadingPosts } = useInstagramPostInsights(from, to);
  const { data: dailyData = [] } = useInstagramAccountDaily(from, to);

  // ── Meta Ads ──────────────────────────────────────────────
  const metaTotais = metaData.reduce(
    (acc, r) => ({
      spend: acc.spend + (r.spend || 0),
      leads: acc.leads + (r.leads || 0),
      purchases: acc.purchases + (r.purchases || 0),
      purchase_value: acc.purchase_value + (r.purchase_value || 0),
      impressions: acc.impressions + (r.impressions || 0),
    }),
    { spend: 0, leads: 0, purchases: 0, purchase_value: 0, impressions: 0 }
  );
  const metaCPL = metaTotais.leads > 0 ? metaTotais.spend / metaTotais.leads : 0;
  const metaROAS = metaTotais.spend > 0 ? metaTotais.purchase_value / metaTotais.spend : 0;

  const porCampanha = metaData.reduce<Record<string, {
    name: string; spend: number; leads: number; purchases: number; purchase_value: number;
  }>>((acc, r) => {
    if (!acc[r.campaign_id]) acc[r.campaign_id] = { name: r.campaign_name, spend: 0, leads: 0, purchases: 0, purchase_value: 0 };
    acc[r.campaign_id].spend += r.spend || 0;
    acc[r.campaign_id].leads += r.leads || 0;
    acc[r.campaign_id].purchases += r.purchases || 0;
    acc[r.campaign_id].purchase_value += r.purchase_value || 0;
    return acc;
  }, {});
  const campanhasMeta = Object.values(porCampanha).sort((a, b) => b.spend - a.spend);
  const metaChartData = campanhasMeta.slice(0, 6).map((c) => ({
    name: c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name,
    Investido: parseFloat(c.spend.toFixed(2)),
    Leads: c.leads,
  }));

  // ── WPP ──────────────────────────────────────────────────
  const wppTotais = wppData?.totais;
  const wppCampanhas = wppData?.campanhas ?? [];

  // ── Instagram ────────────────────────────────────────────
  const lastFollowers: Record<string, number> = {};
  dailyData.forEach(d => { lastFollowers[d.username] = d.followers_count; });

  const topPosts = [...postsData]
    .map(p => ({ ...p, engagement: p.like_count + p.comments_count + p.shares + p.saved }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  const igEngTotal = postsData.reduce((s, p) => s + p.like_count + p.comments_count + p.shares + p.saved, 0);
  const igAlcanceTotal = postsData.reduce((s, p) => s + p.reach, 0);

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
      <div className="flex gap-1 p-1 rounded-lg bg-muted/40 border border-border w-fit">
        <button
          onClick={() => setTab("meta")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
            tab === "meta" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Megaphone className="h-3 w-3" /> Meta Ads
        </button>
        <button
          onClick={() => setTab("wpp")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
            tab === "wpp" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageCircle className="h-3 w-3" /> WPP Campanhas
        </button>
        <button
          onClick={() => setTab("instagram")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
            tab === "instagram" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Instagram className="h-3 w-3" /> Instagram
        </button>
      </div>

      {/* ── TAB META ADS ── */}
      {tab === "meta" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingMeta ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)
            ) : (
              <>
                <StatBox label="Investido (Ads)" value={`R$ ${metaTotais.spend.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} icon={DollarSign} sub="Total no período" />
                <StatBox label="Leads Gerados" value={metaTotais.leads.toLocaleString("pt-BR")} icon={Users} sub={`CPL R$ ${metaCPL.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} highlight />
                <StatBox label="Compras (Meta)" value={metaTotais.purchases.toLocaleString("pt-BR")} icon={BarChart2} sub={`R$ ${metaTotais.purchase_value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} em receita`} />
                <StatBox label="ROAS" value={`${metaROAS.toFixed(2)}×`} icon={TrendingUp} sub={`${metaTotais.impressions.toLocaleString("pt-BR")} impressões`} highlight={metaROAS >= 3} />
              </>
            )}
          </div>
          {!loadingMeta && metaChartData.length > 0 && (
            <GlassCard>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Investido × Leads por Campanha</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metaChartData} margin={{ left: 0, right: 8 }}>
                  <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fill: "#666", fontSize: 10 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#666", fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => name === "Investido" ? `R$ ${v.toLocaleString("pt-BR")}` : v} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="Investido" fill="#C8102E" radius={[4, 4, 0, 0]} opacity={0.85} />
                  <Bar yAxisId="right" dataKey="Leads" fill="#E8384F" radius={[4, 4, 0, 0]} opacity={0.45} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}
          {!loadingMeta && campanhasMeta.length > 0 && (
            <GlassCard>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Detalhamento por Campanha</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Campanha</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Investido</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Leads</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">CPL</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Compras</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campanhasMeta.map((c, i) => {
                      const cpl = c.leads > 0 ? c.spend / c.leads : 0;
                      const roas = c.spend > 0 ? c.purchase_value / c.spend : 0;
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-2 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">R$ {c.spend.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-foreground">{c.leads}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{cpl > 0 ? `R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—"}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{c.purchases}</td>
                          <td className={cn("py-2.5 px-2 text-right font-semibold", roas >= 3 ? "text-emerald-500" : roas > 0 ? "text-muted-foreground" : "text-muted-foreground/40")}>
                            {roas > 0 ? `${roas.toFixed(1)}×` : "—"}
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
            <div className="text-center text-muted-foreground text-sm py-8">Sem dados do Meta Ads no período — aguarde a próxima sincronização do N8N.</div>
          )}
        </div>
      )}

      {/* ── TAB WPP ── */}
      {tab === "wpp" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingWpp ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[96px] rounded-xl" />)
            ) : (
              <>
                <StatBox label="Campanhas" value={wppTotais?.campanhas ?? 0} icon={MessageCircle} sub="Disparadas no período" />
                <StatBox label="Enviadas" value={(wppTotais?.enviadas ?? 0).toLocaleString("pt-BR")} icon={Send} sub={`${(wppTotais?.taxaEntrega ?? 0).toFixed(1)}% entrega`} />
                <StatBox label="Entregues" value={(wppTotais?.entregues ?? 0).toLocaleString("pt-BR")} icon={CheckCheck} highlight />
                <StatBox label="Lidas" value={(wppTotais?.lidas ?? 0).toLocaleString("pt-BR")} icon={Eye} sub={`${(wppTotais?.taxaLeitura ?? 0).toFixed(1)}% leitura`} highlight={(wppTotais?.taxaLeitura ?? 0) >= 50} />
              </>
            )}
          </div>
          {!loadingWpp && wppCampanhas.length > 0 && (
            <GlassCard>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Campanhas WPP — Detalhamento</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Campanha</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Enviadas</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Entregues</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Lidas</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">% Leitura</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Falhas</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wppCampanhas.map((c) => {
                      const taxaLeitura = c.entregues > 0 ? (c.lidos / c.entregues) * 100 : 0;
                      return (
                        <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-2 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{c.total_envios.toLocaleString("pt-BR")}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{c.entregues.toLocaleString("pt-BR")}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-foreground">{c.lidos.toLocaleString("pt-BR")}</td>
                          <td className={cn("py-2.5 px-2 text-right font-semibold", taxaLeitura >= 50 ? "text-emerald-500" : taxaLeitura > 0 ? "text-amber-500" : "text-muted-foreground/40")}>
                            {taxaLeitura > 0 ? `${taxaLeitura.toFixed(1)}%` : "—"}
                          </td>
                          <td className={cn("py-2.5 px-2 text-right", c.falhas > 0 ? "text-destructive" : "text-muted-foreground/40")}>
                            {c.falhas > 0 ? c.falhas : "—"}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold",
                              c.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                              c.status === "firing" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>{c.status}</span>
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
            <div className="text-center text-muted-foreground text-sm py-8">Nenhuma campanha WPP no período selecionado.</div>
          )}
        </div>
      )}

      {/* ── TAB INSTAGRAM ── */}
      {tab === "instagram" && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["eduardocristianoriginal", "costurandosucesso"].map(acc => (
              <div key={acc} className="rounded-xl border border-border p-4 flex flex-col gap-1 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <Instagram className="h-3.5 w-3.5" style={{ color: ACCOUNT_COLORS[acc] }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
                    @{acc === "eduardocristianoriginal" ? "eduardocristianoriginal" : "costurandosucesso"}
                  </span>
                </div>
                <span className="font-bold text-2xl text-foreground leading-none">
                  {fmt(lastFollowers[acc] ?? 0)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5">seguidores</span>
              </div>
            ))}
            <div className="rounded-xl border border-border p-4 flex flex-col gap-1 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Heart className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Engajamento</span>
              </div>
              <span className="font-bold text-2xl text-foreground leading-none">{fmt(igEngTotal)}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">{postsData.length} posts no período</span>
            </div>
            <div className="rounded-xl border border-border p-4 flex flex-col gap-1 bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Share2 className="h-3.5 w-3.5 text-sky-500" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Alcance total</span>
              </div>
              <span className="font-bold text-2xl text-foreground leading-none">{fmt(igAlcanceTotal)}</span>
              <span className="text-[11px] text-muted-foreground mt-0.5">contas únicas alcançadas</span>
            </div>
          </div>

          {/* Top posts */}
          {!loadingPosts && topPosts.length > 0 && (
            <GlassCard>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Top Posts — Engajamento</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Conta</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Data</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Tipo</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">❤️</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Alcance</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">Eng.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map(p => (
                      <tr key={p.post_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-2 font-medium" style={{ color: ACCOUNT_COLORS[p.username] }}>
                          @{p.username === "eduardocristianoriginal" ? "EC" : "CS"}
                        </td>
                        <td className="py-2.5 px-2 text-muted-foreground font-mono">{p.posted_at.split("T")[0]}</td>
                        <td className="py-2.5 px-2">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                            p.media_type === "VIDEO" ? "bg-violet-500/10 text-violet-400" :
                            p.media_type === "CAROUSEL_ALBUM" ? "bg-amber-500/10 text-amber-400" :
                            "bg-sky-500/10 text-sky-400"
                          )}>
                            {p.media_type === "VIDEO" ? "Reel" : p.media_type === "CAROUSEL_ALBUM" ? "Carrossel" : "Imagem"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmt(p.like_count)}</td>
                        <td className="py-2.5 px-2 text-right font-mono">{fmt(p.reach)}</td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-bold text-foreground">{fmt(p.engagement)}</span>
                            <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
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

          {!loadingPosts && postsData.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">Nenhum post encontrado no período selecionado.</div>
          )}
        </div>
      )}
    </div>
  );
}
