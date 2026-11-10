import { classificarConversao } from "@/lib/classificacaoConversao";
import { OrigemLeadsChart } from "@/components/OrigemLeadsChart";
import { EvolucaoFunilChart } from "@/components/EvolucaoFunilChart";
import { ConversaoEtapasChart } from "@/components/ConversaoEtapasChart";
import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { GlassCard } from "@/components/GlassCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Filter, Users, UserCheck, CalendarCheck, Users2, FileText, TrendingUp,
  AlertTriangle, TrendingDown, Lightbulb,
} from "lucide-react";
import { FunilSVGCore } from "@/components/FunilSVGCore";
import { cn } from "@/lib/utils";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList,
  CommandEmpty, CommandItem
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

import { PIPELINE_IDS, FUNIL_CORES } from "@/lib/funis";
import { PerformanceSDR } from "@/components/PerformanceSDR";


// cs-filtros-busca-v2
// cs-filtros-dual-theme-v1
function FiltroPesquisavel({
  titulo, valor, opcoes, onChange,
}: {
  titulo: string;
  valor: string;
  opcoes: { id: string; nome: string }[];
  onChange: (valor: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Selecionar ${titulo}`}
          className="flex w-full min-w-0 min-h-10 items-center
            justify-between gap-2 rounded-lg border
            border-border bg-card/70
            px-3 py-2 text-[13px] text-foreground
            cursor-pointer transition-colors
            hover:bg-accent/60
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="min-w-0 truncate text-left">
            {valor || "Todas"}
          </span>
          <ChevronsUpDown
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={5}
        className="z-[80] w-[var(--radix-popover-trigger-width)]
          max-w-[calc(100vw-24px)] overflow-hidden
          rounded-xl border border-border
          bg-popover p-1 shadow-xl"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder={`Buscar ${titulo.toLowerCase()}...`}
            className="h-10 text-[13px]"
          />
          <CommandList className="max-h-[min(42vh,280px)] overflow-y-auto">
            <CommandEmpty className="p-4 text-center text-[12px] text-muted-foreground">
              Nenhuma opção encontrada.
            </CommandEmpty>

            <CommandItem
              value="Todas"
              onSelect={() => {
                onChange("");
                setAberto(false);
              }}
              className="gap-2 rounded-md px-2.5 py-2.5 text-[13px] leading-snug cursor-pointer aria-selected:!bg-muted aria-selected:!text-foreground data-[selected=true]:!bg-muted data-[selected=true]:!text-foreground hover:!bg-muted hover:!text-foreground"
            >
              <Check className={`h-4 w-4 ${
                !valor ? "text-primary opacity-100" : "opacity-0"
              }`} />
              Todas
            </CommandItem>

            {opcoes.map(item => (
              <CommandItem
                key={item.id}
                value={item.nome}
                onSelect={() => {
                  onChange(item.nome);
                  setAberto(false);
                }}
                className="gap-2 rounded-md px-2.5 py-2.5 text-[13px] leading-snug cursor-pointer aria-selected:!bg-muted aria-selected:!text-foreground data-[selected=true]:!bg-muted data-[selected=true]:!text-foreground hover:!bg-muted hover:!text-foreground"
              >
                <Check className={`h-4 w-4 shrink-0 ${
                  valor === item.nome
                    ? "text-primary opacity-100"
                    : "opacity-0"
                }`} />
                <span className="min-w-0 break-words">
                  {item.nome}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ── Business constants (unchanged from 9088d0b) ───────────────────────────
const METAS = {
  leads_para_mql: 35,
  mql_para_reuniao: 70,
  reuniao_para_show: 70,
  show_para_proposta: 70,
  proposta_para_fechado: 30,
};

function getHoje() { return new Date().toISOString().split("T")[0]; }
function getMesInicio() { return getHoje().substring(0, 7) + "-01"; }
function getSemanaAtras() {
  return new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
}

interface FunilData {
  leads: number; leadsPagos: number; mql: number;
  reunioesAgendadas: number; reunioesRealizadas: number;
  propostas: number; fechados: number;
}

const pct = (a: number, b: number) => b > 0 ? (a / b) * 100 : 0;

// Conversion >100% → gray: inter-stage rates can exceed 100% when the two tables
// use different date reference fields (created_at vs data vs data_fechamento).
// Gray signals a potentially inconsistent denominator without hiding the value.
function getStatusColor(real: number, meta: number) {
  const status = classificarConversao(real, meta);
  if (status === "good")
    return { bg: "#16a34a18", border: "#16a34a", text: "#4ade80" };
  if (status === "near")
    return { bg: "#d9770618", border: "#d97706", text: "#fbbf24" };
  if (status === "bad")
    return { bg: "#dc262618", border: "#dc2626", text: "#f87171" };
  return { bg: "#6b728018", border: "#6b7280", text: "#9ca3af" };
}

function getBarColor(real: number, meta: number): string {
  const status = classificarConversao(real, meta);
  if (status === "good") return "#16a34a";
  if (status === "near") return "#d97706";
  if (status === "bad") return "#dc2626";
  return "#6b7280";
}

// ── useCountUp ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 700, trigger: boolean) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) { setDisplay(0); return; }
    if (target === 0) { setDisplay(0); return; }
    start.current = null;
    const step = (ts: number) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, trigger, duration]);

  return display;
}

// ── CSS animations ────────────────────────────────────────────────────────
const ANIM_ID = "funil-premium-styles";
function injectStyles() {
  if (document.getElementById(ANIM_ID)) return;
  const s = document.createElement("style");
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes funilBadgeIn {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes funilKpiIn {
      from { opacity:0; transform:translateY(4px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes barGrow {
      from { width:0; }
    }
  `;
  document.head.appendChild(s);
}

// ── Conversion badge ──────────────────────────────────────────────────────
function ConvBadge({
  conv, animated, delay,
}: {
  conv: { real: number; meta: number; label: string };
  animated: boolean; delay: number;
}) {
  const sc = getStatusColor(conv.real, conv.meta);
  const hasData = conv.real > 0 || conv.meta > 0;
  return (
    <div
      className="cs-conv-badge-dual-v1 flex flex-col items-center"
      data-status={sc.border === "#16a34a" ? "good" : sc.border === "#d97706" ? "near" : sc.border === "#dc2626" ? "bad" : "invalid"}
      style={{
        opacity: animated ? undefined : 0,
        ...(animated ? {
          animation: `funilBadgeIn 0.38s ease both`,
          animationDelay: `${delay}ms`,
        } : {}),
      }}
    >
      {/* Connector vertical tick */}
      <div style={{
        width: 1, height: 8,
        background: `${sc.border}80`,
        flexShrink: 0, marginBottom: 4,
      }} />
      {/* Connector dot */}
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: sc.border, flexShrink: 0, marginBottom: 6,
        boxShadow: `0 0 5px ${sc.border}50`,
      }} />
      <div
        style={{
          background: sc.bg,
          border: `1px solid ${sc.border}`,
          borderRadius: 8,
          minWidth: 118,
          padding: '10px 12px',
          textAlign: 'center',
        }}
      >
        <div className="cs-conv-colored" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15, color: sc.text }}>
          {hasData ? `${conv.real.toFixed(1)}%` : 'N/D'}
        </div>
        <div className="cs-conv-colored" style={{ fontSize: 12, lineHeight: 1.35, marginTop: 5, color: sc.text, opacity: 0.95 }}>
          {conv.label}
        </div>
        <div className="cs-conv-meta" style={{ fontSize: 11, lineHeight: 1.35, marginTop: 3, color: 'rgba(205,212,222,0.82)' }}>
          meta {conv.meta}%
        </div>
      </div>
    </div>
  );
}

// ── Horizontal funnel + badges ────────────────────────────────────────────
const SHORT_LABELS = ["Leads", "MQL", "Agend.", "Reuniões", "Propostas", "Vendas"];

function FunilHorizontal({
  etapas, conversoes, loading,
}: {
  etapas: { label: string; val: number; pctDeTopo: number }[];
  conversoes: { real: number; meta: number; label: string }[];
  loading: boolean;
}) {
  const [showHint, setShowHint] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const n = etapas.length;

  useEffect(() => { injectStyles(); }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setShowHint(el.scrollWidth > el.clientWidth + 4 && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [loading]);


  const stages = etapas.map((e, i) => ({
    label: e.label,
    shortLabel: SHORT_LABELS[i] ?? e.label,
    val: e.val,
    pctDeTopo: e.pctDeTopo,
  }));

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div>
      {/* cs-funil-mobile-hint-v1 */}
      <div
        aria-hidden={!showHint}
        className={`md:hidden flex min-h-[26px] items-center justify-end gap-2 text-[12px] text-muted-foreground transition-opacity ${
          showHint ? "opacity-100" : "opacity-0"
        }`}
      >
        <span>Deslize para explorar as {n} etapas</span>
        <span aria-hidden="true">→</span>
      </div>

      {/* Scrollable wrapper — SVG + badges share a min-width so badges never overlap */}
      <div style={{ position: 'relative' }}>
      <div ref={scrollRef} style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{
          width: "100%",
          maxWidth: 1350,
          minWidth: 780,
          margin: "0 auto",
        }}>
          {/* True SVG dynamic funnel */}
          <FunilSVGCore
            stages={stages}
            loading={loading && etapas.every(e => e.val === 0)}
            reduceMotion={prefersReduced}
          />

          {/* Conversion badges — positioned at each stage boundary */}
          <div style={{ position: 'relative', marginTop: 2 }}>
            {/* Dotted connector line */}
            <div className="cs-conv-scale-line" style={{
              position: 'absolute',
              top: 3,
              left: `${(1 / n) * 100}%`,
              right: `${(1 / n) * 100}%`,
              borderTop: '1px dashed rgba(120,130,150,0.25)',
              pointerEvents: 'none',
            }} />

            <div style={{ position: 'relative', height: 126 }}>
              {conversoes.map((conv, i) => {
                const leftPct = ((i + 1) / n) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: 0,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <ConvBadge
                      conv={conv}
                      animated={true}
                      delay={i * 60 + 280}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
        {[
          { color: '#16a34a', label: 'acima da meta' },
          { color: '#d97706', label: 'próximo da meta' },
          { color: '#dc2626', label: 'abaixo da meta' },
          { color: '#6b7280', label: 'taxa inconsistente' },
        ].map(({ color, label }) => (
          <div key={label} className="cs-conv-legend flex items-center gap-1.5" style={{ fontSize: 12, color: '#9ca3af' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Insights panel ────────────────────────────────────────────────────────
// Derives insights purely from existing conversoes data — no new queries.
function InsightsPanel({
  conversoes, loading, onInvestigar,
}: {
  conversoes: { real: number; meta: number; label: string }[];
  loading: boolean;
  onInvestigar: (etapa: string) => void;
}) {
  const NAMES = [
    "Leads → MQL",
    "MQL → Agendamento",
    "Agendamento → Reunião",
    "Reunião → Proposta",
    "Proposta → Venda",
  ];

  const items = conversoes.map((c, i) => ({
    name: NAMES[i],
    real: c.real,
    meta: c.meta,
    label: c.label,
    gap: c.real <= 100 ? c.meta - c.real : null,
  }));

  // Taxas acima de 100% exigem análise específica e não são
  // classificadas automaticamente como sucesso ou gargalo.
  const valid = items.filter(
    i => i.gap !== null && Number.isFinite(i.real) &&
         Number.isFinite(i.meta) && i.meta > 0
  );

  const belowMeta = valid.filter(i => i.real < i.meta);

  // 1. Maior distância absoluta abaixo da meta
  const gargalo = [...belowMeta].sort(
    (a, b) => (b.gap ?? 0) - (a.gap ?? 0)
  )[0];

  // 2. Pior desempenho proporcional, excluindo o gargalo
  const outrosProblemas = belowMeta.filter(i => i.name !== gargalo?.name);
  const critico = [...outrosProblemas].sort(
    (a, b) => (a.real / a.meta) - (b.real / b.meta)
  )[0];

  // 3. Melhor oportunidade distinta:
  // primeiro busca resultado abaixo da meta que esteja mais próximo
  // dela; se não houver, destaca uma etapa acima da meta.
  const usados = new Set(
    [gargalo?.name, critico?.name].filter(Boolean)
  );

  const oportunidadesAbaixo = belowMeta
    .filter(i => !usados.has(i.name))
    .sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0));

  const oportunidadesAcima = valid
    .filter(i => i.real >= i.meta && !usados.has(i.name))
    .sort((a, b) => (b.real - b.meta) - (a.real - a.meta));

  const oportunidade = oportunidadesAbaixo[0] ?? oportunidadesAcima[0];

  const insights: {
    tipo: string;
    cor: string;
    bgCor: string;
    icon: React.ElementType;
    titulo: string;
    descricao: string;
  }[] = [];

  if (!loading && gargalo) {
    insights.push({
      tipo: "Gargalo principal",
      cor: "#f87171",
      bgCor: "#dc262612",
      icon: AlertTriangle,
      titulo: gargalo.name,
      descricao: `Prioridade: investigar oportunidades paradas e motivos de perda. Desvio de ${Math.abs(gargalo.gap ?? 0).toFixed(1)} p.p. da meta.`,
    });
  }

  if (!loading && critico) {
    insights.push({
      tipo: "Ponto crítico",
      cor: "#fb923c",
      bgCor: "#ea580c12",
      icon: TrendingDown,
      titulo: critico.name,
      descricao: `Revisar a abordagem e o acompanhamento nesta etapa. Atingimento de ${((critico.real / critico.meta) * 100).toFixed(0)}% da meta.`,
    });
  }

  if (!loading && oportunidade) {
    const acimaDaMeta = oportunidade.real >= oportunidade.meta;

    insights.push({
      tipo: "Oportunidade",
      cor: "#fbbf24",
      bgCor: "#d9770612",
      icon: Lightbulb,
      titulo: oportunidade.name,
      descricao: acimaDaMeta
        ? `Etapa acima da meta. Identificar as práticas comerciais que contribuem para esse desempenho.`
        : `Etapa próxima da meta. Avaliar ações para recuperar os ${Math.abs(oportunidade.gap ?? 0).toFixed(1)} p.p. restantes.`,
    });
  }

  return (
    <div className="cs-insights-executivo-v1 grid grid-cols-1 lg:grid-cols-3 2xl:flex 2xl:flex-col gap-3 h-full min-w-0">
      <div className="flex items-center justify-between lg:col-span-3 2xl:col-span-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
          Principais Insights
        </span>
      </div>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 p-4 animate-pulse"
            style={{ background: 'hsl(var(--card)/0.4)', height: 100 }}
          />
        ))
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-border/30 p-4 text-center" style={{ background: 'hsl(var(--card)/0.3)' }}>
          <p className="text-xs text-muted-foreground">Sem dados suficientes para gerar insights.</p>
        </div>
      ) : (
        insights.map((ins) => {
          const Icon = ins.icon;
          return (
            <div
              key={ins.tipo}
              data-insight={ins.tipo}
              className="cs-insights-dual-theme-v1 rounded-xl border p-4 flex flex-col gap-2 min-w-0 h-full 2xl:flex-1"
              style={{
                background: "rgba(255,255,255,0.012)",
                borderColor: "rgba(180,194,212,0.11)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${ins.cor}20` }}
                >
                  <Icon className="cs-insight-icon-v1" style={{ width: 14, height: 14, color: ins.cor }} />
                </div>
                <span className="cs-insight-label-v1 text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: ins.cor }}>
                  {ins.tipo}
                </span>
              </div>
              <p className="text-[15px] font-semibold text-foreground leading-snug">{ins.titulo}</p>
              <p className="cs-insight-description-v1 text-[13px] text-muted-foreground leading-[1.55]">{ins.descricao}</p>
              <button
                type="button"
                onClick={() => onInvestigar(ins.titulo)}
                className="cs-insight-action-v1 cursor-pointer mt-auto self-start rounded-md border px-3 py-2 text-[12px] font-semibold transition-colors hover:bg-muted/60 dark:hover:bg-white/[0.07]"
                style={{ color: ins.cor, borderColor: `${ins.cor}55` }}
              >
                Investigar etapa →
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── KPI progress card ─────────────────────────────────────────────────────
function KpiCard({
  label, val, icon: Icon, metaText, ratePct, metaPct, loading, animDelay,
}: {
  label: string; val: number; icon: React.ElementType;
  metaText: string; ratePct: number; metaPct: number; loading: boolean; animDelay: number;
}) {
  const barColor =
    metaPct === 100 && ratePct > 100
      ? "#16a34a"
      : getBarColor(ratePct, metaPct);
  const displayPct = Math.min(Math.max(ratePct, 0), 100);

  return (
    <div
      className={cn("glass-card cs-kpi-insight-surface-v15 cs-tipografia-executiva-v1 cs-kpi-light-alert-v6 cs-glass-light-v5 cursor-default relative !p-4 min-w-0 overflow-hidden flex flex-col justify-between transition-[border-color,box-shadow] duration-300", barColor === "#dc2626" ? "cs-kpi-light-critical" : barColor === "#d97706" ? "cs-kpi-light-attention" : "cs-kpi-light-neutral")}
      style={{ ["--cs-kpi-accent" as any]: barColor, 
        minHeight: 168,
        background: `linear-gradient(155deg, ${barColor}13 0%, ${barColor}05 32%, transparent 67%), hsl(var(--card) / var(--cs-kpi-glass-alpha))`,
        borderColor: `${barColor}42`,
        backdropFilter: "blur(5px)",
        boxShadow: `inset 0 1px 0 ${barColor}20, inset 0 -1px 0 rgba(255,255,255,0.025), 0 8px 24px rgba(0,0,0,0.12)`,
        animation: "funilKpiIn 0.35s ease both",
        animationDelay: `${animDelay}ms`,
      }}
    >
      <div
        className={cn("absolute top-0 left-0 right-0 h-[2px] dark:opacity-100", barColor === "#dc2626" ? "opacity-100" : "opacity-65")}
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${barColor}CC 24%, ${barColor}80 67%, transparent 100%)`,
          boxShadow: `0 1px 15px ${barColor}45`,
        }}
      />

      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.045em] text-muted-foreground leading-[1.4]">
          {label}
        </span>

        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(145deg, ${barColor}24, ${barColor}08)`,
            border: `1px solid ${barColor}38`,
            boxShadow: `inset 0 1px 0 ${barColor}18`,
          }}
        >
          <Icon
            className="w-4 h-4"
            style={{ color: barColor }}
          />
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[35px] font-extrabold tracking-[-0.04em] leading-none text-foreground tabular-nums">
            {loading ? "—" : val.toLocaleString("pt-BR")}
          </span>
        </div>

        <p className="text-[12px] text-muted-foreground mt-2 leading-snug">
          {metaText}
        </p>
      </div>

      <div className="mt-4">
        <div className="relative h-[6px] rounded-full bg-black/[0.08] dark:bg-white/[0.07]">
          <div
            className="h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.08)] dark:shadow-none"
            style={{
              width: loading ? "0%" : `${displayPct}%`,
              backgroundColor: barColor,
              boxShadow: `0 0 0 1px ${barColor}18, 0 0 10px ${barColor}22`,
              transition: "width 650ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
          {/* cs-kpi-meta-marker-v2: posição real da meta */}
          {!loading && metaPct > 0 && metaPct < 100 && (
            <span
              aria-hidden="true"
              title={`Meta: ${metaPct}%`}
              className="absolute z-10 pointer-events-none
                top-[-4px] h-[14px] w-[2px] rounded-full
                bg-slate-600 dark:bg-slate-200"
              style={{
                left: `${metaPct}%`,
                transform: "translateX(-50%)",
                boxShadow: "0 0 0 1px rgba(128,140,160,0.28)",
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-[12px] text-muted-foreground/85 uppercase tracking-[0.04em]">
            Desempenho
          </span>

          <span
            className="text-[14px] font-bold tabular-nums"
            style={{ color: loading ? "#6b7280" : barColor }}
          >
            {loading ? "—" : `${ratePct.toFixed(1)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function FunilXPTO({
  embedded = false,
  hideInternalTabs = false,
}: {
  embedded?: boolean;
  hideInternalTabs?: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [embeddedTab, setEmbeddedTab] = useState<"funil" | "sdr">("funil");
  const aba: "funil" | "sdr" = embedded
    ? embeddedTab
    : searchParams.get("comercial") === "sdr" ? "sdr" : "funil";

  function setAba(value: "funil" | "sdr") {
    if (embedded) {
      setEmbeddedTab(value);
      return;
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("comercial", value);
      return next;
    }, { replace: true });
  }

  const [funisSel, setFunisSel] = useState<string[]>([]);
  const [periodo, setPeriodo] = useState<"hoje" | "semana" | "mes" | "personalizado">("mes");
  const [customStart, setCustomStart] = useState(getMesInicio());
  const [customEnd, setCustomEnd] = useState(getHoje());
  const [campanhasSel, setCampanhasSel] = useState<string>("");
  const [origensSel, setOrigensSel] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  // cs-filtros-confirmacao-v1
  const [filtrosRascunho, setFiltrosRascunho] = useState({ periodo, customStart, customEnd, campanhasSel, origensSel });
  const [modoFunil, setModoFunil] = useState<
    "quantidade" | "conversao" | "receita"
  >("quantidade");
  const [receitaFechada, setReceitaFechada] = useState(0);
  const [receitaErro, setReceitaErro] = useState<string | null>(null);

  const [investigacao, setInvestigacao] = useState<{
    etapa: string;
    fonte: string;
    aviso: string;
  } | null>(null);
  const [investigacaoLoading, setInvestigacaoLoading] = useState(false);
  const [investigacaoErro, setInvestigacaoErro] = useState<string | null>(null);
  const [investigacaoRegistros, setInvestigacaoRegistros] = useState<
    { titulo: string; descricao: string }[]
  >([]);
  const [data, setData] = useState<FunilData>({
    leads: 0, leadsPagos: 0, mql: 0,
    reunioesAgendadas: 0, reunioesRealizadas: 0,
    propostas: 0, fechados: 0,
  });
  const [loading, setLoading] = useState(true);

  const { data: campanhas } = useConfiguracoes("Campanha");
  const { data: origens } = useConfiguracoes("Origem");
  const { data: custos = [] } = useCustosMarketing();
  const { funisVisiveis: FUNIS_XPTO } = useFunisVisiveis();

  const start = periodo === "hoje" ? getHoje()
    : periodo === "semana" ? getSemanaAtras()
    : periodo === "mes" ? getMesInicio()
    : customStart;
  const end = periodo === "personalizado" ? customEnd : getHoje();

  const todosSelecionados = funisSel.length === 0;
  const funisFiltrados = todosSelecionados ? FUNIS_XPTO : FUNIS_XPTO.filter(f => funisSel.includes(f));
  const pipelineIdsFiltrados = funisFiltrados.map(f => PIPELINE_IDS[f]);

  const periodoLabel = periodo === "hoje" ? "Hoje"
    : periodo === "semana" ? "Últimos 7 dias"
    : periodo === "mes" ? "Este mês"
    : `${customStart} → ${customEnd}`;

  const funilLabel = todosSelecionados ? "Todos os funis"
    : funisSel.length === 1 ? funisSel[0]
    : `${funisSel.length} funis`;

  const activeFilters = (campanhasSel ? 1 : 0) + (origensSel ? 1 : 0);

  const totalCustosAds = custos
    .filter((c: any) => {
      if (c.categoria !== "Ads") return false;
      if (c.data < start || c.data > end) return false;
      if (!todosSelecionados && !funisFiltrados.map(f => f.toUpperCase()).includes((c.produto || "").toUpperCase())) return false;
      return true;
    })
    .reduce((s: number, c: any) => s + Number(c.valor), 0);

  const cpl = data.leadsPagos > 0 ? totalCustosAds / data.leadsPagos : 0;
  const cac = data.fechados > 0 ? totalCustosAds / data.fechados : 0;
  const corPrincipal = todosSelecionados ? "#E8192C" : (FUNIL_CORES[funisSel[0]] ?? "#E8192C");

  function toggleFunil(funil: string) {
    setFunisSel(prev => prev.includes(funil) ? prev.filter(f => f !== funil) : [...prev, funil]);
  }


  // Investigação: registros individuais da etapa de destino.
  // Não presume ligação entre reuniões e propostas.
  async function abrirInvestigacao(etapa: string) {
    const isMql = etapa === "Leads → MQL";
    const isAgendamento = etapa === "MQL → Agendamento";
    const isReuniao = etapa === "Agendamento → Reunião";
    const isProposta = etapa === "Reunião → Proposta";
    const isVenda = etapa === "Proposta → Venda";

    const fonte = isMql ? "MQLs registrados"
      : isAgendamento || isReuniao ? "Reuniões registradas"
      : isProposta ? "Propostas registradas"
      : isVenda ? "Vendas fechadas"
      : "Registros comerciais";

    const aviso = isMql
      ? "Esta fonte identifica MQLs, não todos os leads recebidos. Não permite listar automaticamente os leads que deixaram de qualificar."
      : isProposta
      ? "A lista contém propostas registradas. A base atual não permite relacionar individualmente cada proposta a uma reunião."
      : isAgendamento || isReuniao
      ? "A fonte registra data e comparecimento, mas não identifica o negócio nem o responsável pela reunião."
      : "A lista apresenta vendas fechadas, não todos os negócios que receberam propostas.";

    setInvestigacao({ etapa, fonte, aviso });
    setInvestigacaoLoading(true);
    setInvestigacaoErro(null);
    setInvestigacaoRegistros([]);

    try {
      let registros: { titulo: string; descricao: string }[] = [];
      const semFunis = !todosSelecionados && pipelineIdsFiltrados.length === 0;

      if (semFunis) {
        registros = [];
      } else if (isMql) {
        let q = supabase.from("leads_geografia")
          .select("deal_id, rating, created_at")
          .eq("deletado", false)
          .in("rating", [3, 5])
          .gte("created_at", start)
          .lte("created_at", end + "T23:59:59");

        if (!todosSelecionados) {
          q = q.in("pipeline_id", pipelineIdsFiltrados);
        }

        const { data: rows, error } = await q
          .order("created_at", { ascending: false }).limit(40);
        if (error) throw error;

        registros = (rows ?? []).map(r => ({
          titulo: `Negócio ${r.deal_id}`,
          descricao: `Rating: ${r.rating ?? "—"} · Criado: ${r.created_at?.slice(0, 10) ?? "—"}`,
        }));
      } else if (isAgendamento || isReuniao) {
        let q = supabase.from("reunioes_agendadas")
          .select("id, data, compareceu")
          .gte("data", start).lte("data", end);

        if (!todosSelecionados) {
          q = q.in("pipeline_id", pipelineIdsFiltrados);
        }

        const { data: rows, error } = await q
          .order("data", { ascending: false }).limit(40);
        if (error) throw error;

        registros = (rows ?? []).map(r => ({
          titulo: `Reunião · ${r.data}`,
          descricao: `Comparecimento: ${r.compareceu ? "Confirmado" : "Não registrado como realizado"} · Registro ${r.id.slice(0, 8)}`,
        }));
      } else if (isProposta) {
        let q = supabase.from("propostas_crm")
          .select("deal_id, data")
          .gte("data", start).lte("data", end);

        if (!todosSelecionados) {
          q = q.in("pipeline_id", pipelineIdsFiltrados);
        }

        const { data: rows, error } = await q
          .order("data", { ascending: false }).limit(40);
        if (error) throw error;

        registros = (rows ?? []).map(r => ({
          titulo: `Negócio ${r.deal_id}`,
          descricao: `Proposta registrada em ${r.data}`,
        }));
      } else if (isVenda) {
        let q = supabase.from("vendas")
          .select("nome_cliente, empresa, valor, data_fechamento")
          .eq("status", "Fechado")
          .gte("data_fechamento", start)
          .lte("data_fechamento", end);

        if (!todosSelecionados) {
          q = q.in("funil", funisFiltrados);
        }
        if (campanhasSel) q = q.eq("campanha", campanhasSel);
        if (origensSel) q = q.eq("origem", origensSel);

        const { data: rows, error } = await q
          .order("data_fechamento", { ascending: false }).limit(40);
        if (error) throw error;

        registros = (rows ?? []).map(r => ({
          titulo: r.nome_cliente,
          descricao: `${r.empresa || "Empresa não informada"} · ${Number(r.valor).toLocaleString("pt-BR", {style:"currency",currency:"BRL"})} · ${r.data_fechamento ?? "—"}`,
        }));
      }

      setInvestigacaoRegistros(registros);
    } catch (e) {
      setInvestigacaoErro(
        e instanceof Error ? e.message : "Erro ao consultar registros."
      );
    } finally {
      setInvestigacaoLoading(false);
    }
  }

  // ── Data fetching (unchanged from 9088d0b) ──────────────────────────────
  async function fetchData() {
    setLoading(true);
    let leadsQuery = supabase.from("leads_diarios_por_funil").select("total_leads, total_leads_pagos").gte("data", start).lte("data", end);
    if (!todosSelecionados) leadsQuery = leadsQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: leadsRows } = await leadsQuery;
    const totalLeads = (leadsRows ?? []).reduce((s: number, r: any) => s + r.total_leads, 0);
    const totalLeadsPagos = (leadsRows ?? []).reduce((s: number, r: any) => s + (r.total_leads_pagos || 0), 0);

    let mqlQuery = supabase.from("leads_geografia").select("deal_id").eq("deletado", false).in("rating", [3, 5]).gte("created_at", start).lte("created_at", end + "T23:59:59");
    if (!todosSelecionados) mqlQuery = mqlQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: mqlRows } = await mqlQuery;
    const totalMQL = (mqlRows ?? []).length;

    let reunQuery = supabase.from("reunioes_agendadas").select("compareceu").gte("data", start).lte("data", end);
    if (!todosSelecionados) reunQuery = reunQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: reunRows } = await reunQuery;
    const totalAgendadas = (reunRows ?? []).length;
    const totalRealizadas = (reunRows ?? []).filter((r: any) => r.compareceu === true).length;

    let propQuery = supabase.from("propostas_crm").select("deal_id").gte("data", start).lte("data", end);
    if (!todosSelecionados) propQuery = propQuery.in("pipeline_id", pipelineIdsFiltrados);
    const { data: propRows } = await propQuery;
    const totalPropostas = (propRows ?? []).length;

    // Paginação completa da fonte financeira já utilizada.
    // Mantém os mesmos filtros e a mesma regra de fechamento.
    const vendasRows: Array<{ status: string | null; valor: number | null }> = [];
    const pageSize = 1000;
    let vendasFalharam = false;

    setReceitaErro(null);

    for (let from = 0; ; from += pageSize) {
      let vendaQuery = supabase
        .from("vendas")
        .select("status, funil, valor")
        .gte("data_fechamento", start)
        .lte("data_fechamento", end);

      if (!todosSelecionados) vendaQuery = vendaQuery.in("funil", funisFiltrados);
      if (campanhasSel) vendaQuery = vendaQuery.eq("campanha", campanhasSel);
      if (origensSel) vendaQuery = vendaQuery.eq("origem", origensSel);

      const { data: lote, error: erroVendas } = await vendaQuery
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (erroVendas) {
        vendasFalharam = true;
        setReceitaErro(erroVendas.message);
        break;
      }

      vendasRows.push(...(lote ?? []));

      if (!lote || lote.length < pageSize) break;
    }

    const vendasFechadas = vendasFalharam
      ? []
      : vendasRows.filter(v => v.status === "Fechado");

    const totalFechados = vendasFechadas.length;

    const receitaCalculada = vendasFechadas.reduce(
      (total, v) => total + (Number(v.valor) || 0), 0
    );

    setReceitaFechada(receitaCalculada);

    setData({ leads: totalLeads, leadsPagos: totalLeadsPagos, mql: totalMQL, reunioesAgendadas: totalAgendadas, reunioesRealizadas: totalRealizadas, propostas: totalPropostas, fechados: totalFechados });
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [funisSel, periodo, customStart, customEnd, campanhasSel, origensSel]);

  // ── Derived state (formulas unchanged from 9088d0b) ─────────────────────
  const etapas = [
    { label: "Leads recebidos",     val: data.leads,               pctDeTopo: data.leads > 0 ? 100 : 0 },
    { label: "MQL qualificados",    val: data.mql,                 pctDeTopo: pct(data.mql, data.leads) },
    { label: "Reuniões agendadas",  val: data.reunioesAgendadas,   pctDeTopo: pct(data.reunioesAgendadas, data.leads) },
    { label: "Reuniões realizadas", val: data.reunioesRealizadas,  pctDeTopo: pct(data.reunioesRealizadas, data.leads) },
    { label: "Propostas enviadas",  val: data.propostas,           pctDeTopo: pct(data.propostas, data.leads) },
    { label: "Fechados",            val: data.fechados,            pctDeTopo: pct(data.fechados, data.leads) },
  ];

  const conversoes = [
    { real: pct(data.mql, data.leads),                              meta: METAS.leads_para_mql,        label: "qualificados" },
    { real: pct(data.reunioesAgendadas, data.mql),                  meta: METAS.mql_para_reuniao,      label: "agendaram" },
    { real: pct(data.reunioesRealizadas, data.reunioesAgendadas),   meta: METAS.reuniao_para_show,     label: "compareceram" },
    { real: pct(data.propostas, data.reunioesRealizadas),           meta: METAS.show_para_proposta,    label: "receberam proposta" },
    { real: pct(data.fechados, data.propostas),                     meta: METAS.proposta_para_fechado, label: "fecharam" },
  ];

  const aiPayload = {
    periodo: periodoLabel,
    funil: funilLabel,
    leads_recebidos: data.leads,
    mql: data.mql,
    pct_qualificacao: `${pct(data.mql, data.leads).toFixed(1)}% (meta: ${METAS.leads_para_mql}%)`,
    reunioes_agendadas: data.reunioesAgendadas,
    pct_agendamento: `${pct(data.reunioesAgendadas, data.mql).toFixed(1)}% (meta: ${METAS.mql_para_reuniao}%)`,
    reunioes_realizadas: data.reunioesRealizadas,
    pct_showup: `${pct(data.reunioesRealizadas, data.reunioesAgendadas).toFixed(1)}% (meta: ${METAS.reuniao_para_show}%)`,
    propostas: data.propostas,
    pct_proposta: `${pct(data.propostas, data.reunioesRealizadas).toFixed(1)}% (meta: ${METAS.show_para_proposta}%)`,
    fechados: data.fechados,
    pct_fechamento: `${pct(data.fechados, data.propostas).toFixed(1)}% (meta: ${METAS.proposta_para_fechado}%)`,
    taxa_global: `${pct(data.fechados, data.leads).toFixed(1)}%`,
    cpl: totalCustosAds > 0 ? `R$ ${cpl.toFixed(0)}` : "sem dados de custo",
    cac: totalCustosAds > 0 ? `R$ ${cac.toFixed(0)}` : "sem dados de custo",
  };

  void corPrincipal;

  // KPI cards — progress % relative to each stage's conversion meta
  const kpiDefs = [
    {
      label: "Leads Recebidos",    val: data.leads,               icon: Users,
      metaText: "Meta: 300/mês",
      ratePct: Math.min(pct(data.leads, 300), 100),
    },
    {
      label: "MQL Qualificados",   val: data.mql,                 icon: UserCheck,
      metaText: `Meta: ${METAS.leads_para_mql}% leads`,
      ratePct: Math.min(pct(data.mql, data.leads), 100),
    },
    {
      label: "Reuniões Agendadas", val: data.reunioesAgendadas,   icon: CalendarCheck,
      metaText: `Meta: ${METAS.mql_para_reuniao}% MQL`,
      ratePct: Math.min(pct(data.reunioesAgendadas, data.mql), 100),
    },
    {
      label: "Reuniões Realizadas",val: data.reunioesRealizadas,  icon: Users2,
      metaText: `Meta: ${METAS.reuniao_para_show}% agend.`,
      ratePct: Math.min(pct(data.reunioesRealizadas, data.reunioesAgendadas), 100),
    },
    {
      label: "Propostas Enviadas", val: data.propostas,           icon: FileText,
      metaText: `Meta: ${METAS.show_para_proposta}% reun.`,
      ratePct: Math.min(pct(data.propostas, data.reunioesRealizadas), 100),
    },
    {
      label: "Vendas Fechadas",    val: data.fechados,            icon: TrendingUp,
      metaText: `Meta: ${METAS.proposta_para_fechado}% prop.`,
      ratePct: Math.min(pct(data.fechados, data.propostas), 100),
    },
  ];

  return (
    <div className="space-y-5">
      <Sheet
        open={investigacao !== null}
        onOpenChange={(open) => {
          if (!open) setInvestigacao(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-border overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-bold">
              Investigar etapa comercial
            </SheetTitle>
          </SheetHeader>

          {investigacao && (
            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-border/40 p-4">
                <p className="text-xs font-semibold">{investigacao.etapa}</p>
                <p className="text-sm text-muted-foreground mt-2">{investigacao.fonte}</p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {periodoLabel} · {funilLabel}
                </p>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {investigacao.aviso}
                </p>
                {(campanhasSel || origensSel) &&
                  investigacao.etapa !== "Proposta → Venda" && (
                    <p className="text-xs leading-relaxed text-amber-400 mt-2">
                      Atenção: a fonte desta etapa não disponibiliza filtros de campanha
                      e origem. A lista considera apenas período e funis.
                    </p>
                  )}
              </div>

              <div>
                <p className="text-xs font-semibold mb-3">
                  Registros disponíveis — até 40
                </p>
                {investigacaoLoading ? (
                  <p className="text-sm text-muted-foreground">Consultando registros...</p>
                ) : investigacaoErro ? (
                  <p role="alert" className="text-sm text-red-400">
                    Consulta indisponível: {investigacaoErro}
                  </p>
                ) : investigacaoRegistros.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum registro encontrado para os filtros aplicáveis.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {investigacaoRegistros.map((registro, i) => (
                      <div key={i}
                        className="rounded-lg border border-border/30 bg-white/[0.025] p-3">
                        <p className="text-xs font-semibold break-words">
                          {registro.titulo}
                        </p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground mt-1 break-words">
                          {registro.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Esta é uma consulta de registros da etapa, não uma reconstrução
                do percurso individual entre todas as etapas do funil.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Page header ── */}
      <div className="cs-filtros-executivo-v1 flex flex-col min-[1750px]:flex-row min-[1750px]:items-start min-[1750px]:justify-between gap-3 min-w-0">
        <div>
          <h1 className="font-display font-bold text-[20px] sm:text-[21px] leading-tight">Funil Comercial</h1>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Acompanhe a evolução dos leads e identifique onde estão as maiores oportunidades.
          </p>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 flex-nowrap overflow-x-auto overscroll-x-contain pb-2 min-[1750px]:w-auto min-[1750px]:justify-end min-[1750px]:flex-wrap min-[1750px]:overflow-visible min-[1750px]:pb-0">
          {/* Funil / SDR tab */}
          {false && !hideInternalTabs && <div className="inline-flex bg-muted/30 border border-border rounded-full p-1">
            <button
              onClick={() => setAba("funil")}
              className={cn("text-xs font-semibold uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all", aba === "funil" ? "bg-primary text-white shadow-[0_0_14px_-2px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}
            >Funil</button>
            <button
              onClick={() => setAba("sdr")}
              className={cn("text-xs font-semibold uppercase tracking-wide px-3.5 py-1.5 rounded-full transition-all", aba === "sdr" ? "bg-primary text-white shadow-[0_0_14px_-2px_hsl(var(--primary)/0.5)]" : "text-muted-foreground")}
            >SDR</button>
          </div>}
          {/* Funil selector chips */}
          <button
            type="button"
            data-cs-funil-chip="true"
            aria-pressed={todosSelecionados}
            onClick={() => setFunisSel([])}
            className={cn("cursor-pointer shrink-0 whitespace-nowrap min-h-9 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60", todosSelecionados ? "text-white bg-primary border-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}
          >Todos os funis</button>
          {FUNIS_XPTO.map((f) => {
            const sel = funisSel.includes(f);
            return (
              <button
                key={f}
                type="button"
                data-cs-funil-chip="true"
                aria-pressed={sel}
                onClick={() => toggleFunil(f)}
                className={cn("cursor-pointer shrink-0 whitespace-nowrap min-h-9 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60", sel ? "text-white border-transparent" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}
                
              >{f}</button>
            );
          })}
          {/* Filter drawer */}
          <Sheet open={filterOpen} onOpenChange={(aberto) => { if (aberto) setFiltrosRascunho({ periodo, customStart, customEnd, campanhasSel, origensSel }); setFilterOpen(aberto); }}>
            <SheetTrigger asChild>
              <button className="flex shrink-0 whitespace-nowrap cursor-pointer min-h-9 items-center gap-2 text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full border border-border bg-muted/30 text-muted-foreground hover:border-primary/40 transition-all">
                <Filter className="h-3 w-3" />Filtros
                {activeFilters > 0 && (
                  <span className="bg-primary text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="cs-filtro-drawer-v23 w-80 bg-background border-border">
              <SheetHeader>
                <SheetTitle className="font-display uppercase tracking-widest text-sm">Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Período</label>
                  {/* cs-periodo-executivo-v1 */}
                  <div role="group" aria-label="Período"
                    className="grid grid-cols-2 gap-2">
                    {([
                      ["hoje", "Hoje"],
                      ["semana", "Últimos 7 dias"],
                      ["mes", "Este mês"],
                      ["personalizado", "Personalizado"],
                    ] as const).map(([valor, nome]) => (
                      <button
                        key={valor}
                        type="button"
                        aria-pressed={filtrosRascunho.periodo === valor}
                        onClick={() => setFiltrosRascunho(f => ({ ...f, periodo: valor }))}
                        className={cn(
                          "min-h-11 rounded-lg border px-2 py-2",
                          "text-[12px] sm:text-[13px] font-semibold",
                          "cursor-pointer transition-colors",
                          "focus-visible:outline-none",
                          "focus-visible:ring-2 focus-visible:ring-primary/60",
                          filtrosRascunho.periodo === valor
                            ? "border-primary/65 bg-primary/[0.13] text-foreground"
                            : "border-white/[0.10] bg-white/[0.025] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                        )}
                      >
                        {nome}
                      </button>
                    ))}
                  </div>
                  {filtrosRascunho.periodo === "personalizado" && (
                    <div className="mt-2 space-y-2">
                      <input type="date" aria-label="Data inicial" value={filtrosRascunho.customStart} max={filtrosRascunho.customEnd} onChange={(e) => setFiltrosRascunho(f => ({ ...f, customStart: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground" />
                      <input type="date" aria-label="Data final" value={filtrosRascunho.customEnd} min={filtrosRascunho.customStart} max={getHoje()} onChange={(e) => setFiltrosRascunho(f => ({ ...f, customEnd: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Campanha</label>
                  
                  <FiltroPesquisavel
                    titulo="Campanha"
                    valor={filtrosRascunho.campanhasSel}
                    onChange={v => setFiltrosRascunho(f => ({ ...f, campanhasSel: v }))}
                    opcoes={(campanhas ?? []).map((c: any) => ({
                      id: String(c.id),
                      nome: String(c.valor ?? ""),
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Origem</label>
                  
                  <FiltroPesquisavel
                    titulo="Origem"
                    valor={filtrosRascunho.origensSel}
                    onChange={v => setFiltrosRascunho(f => ({ ...f, origensSel: v }))}
                    opcoes={(origens ?? []).map((o: any) => ({
                      id: String(o.id),
                      nome: String(o.valor ?? ""),
                    }))}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setFiltrosRascunho({ periodo: "mes", customStart: getMesInicio(), customEnd: getHoje(), campanhasSel: "", origensSel: "" })} className="flex-1 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:bg-muted/30 transition-all">Limpar</button>
                  <button disabled={filtrosRascunho.periodo === "personalizado" && (!filtrosRascunho.customStart || !filtrosRascunho.customEnd || filtrosRascunho.customStart > filtrosRascunho.customEnd || filtrosRascunho.customEnd > getHoje())} onClick={() => { setPeriodo(filtrosRascunho.periodo); setCustomStart(filtrosRascunho.customStart); setCustomEnd(filtrosRascunho.customEnd); setCampanhasSel(filtrosRascunho.campanhasSel); setOrigensSel(filtrosRascunho.origensSel); setFilterOpen(false); }} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold transition-all hover:opacity-90">Aplicar filtros</button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <>
          {/* ── KPI row ── */}
          <div className="cs-kpis-executivo-v1 grid grid-cols-2 sm:grid-cols-3 min-[1280px]:grid-cols-6 gap-2.5 sm:gap-3">
            {kpiDefs.map((k, i) => (
              <KpiCard
                key={k.label}
                label={k.label}
                val={k.val}
                icon={k.icon}
                metaText={k.metaText}
                ratePct={k.ratePct}
                metaPct={[
                  100,
                  METAS.leads_para_mql,
                  METAS.mql_para_reuniao,
                  METAS.reuniao_para_show,
                  METAS.show_para_proposta,
                  METAS.proposta_para_fechado,
                ][i]}
                loading={loading}
                animDelay={i * 50}
              />
            ))}
          
            {/* cs-kpi-legenda-meta-v2 */}
            <div className="col-span-full flex items-center
              justify-end gap-2 -mt-1 text-[12px]
              text-foreground/70 dark:text-slate-300/80">
              <span
                aria-hidden="true"
                className="inline-block h-[12px] w-[2px]
                  rounded-full bg-slate-600
                  dark:bg-slate-200"
              />
              <span>Traço = meta de conversão</span>
            </div>
          </div>

          {/* ── CPL / CAC · Executivo CS ── */}
          {totalCustosAds > 0 && (
            <div className="cs-aquisicao-executiva-v2 cs-aquisicao-dual-theme-v3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(230px,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0 rounded-xl border border-border dark:border-white/[0.08] bg-card/70 dark:bg-white/[0.015] shadow-sm dark:shadow-none overflow-hidden">
              <div className="min-w-0 px-4 py-3
                sm:col-span-2 lg:col-span-1 flex flex-col
                justify-center border-b lg:border-b-0
                lg:border-r border-border dark:border-white/[0.08]">
                <p className="text-[13px] font-bold
                  text-foreground uppercase tracking-[0.04em]">
                  Eficiência de aquisição
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Indicadores financeiros de Ads
                </p>
              </div>
              {[
                {
                  label: "CPL",
                  val: `R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
                  sub: `${data.leadsPagos} leads via Ads`,
                },
                {
                  label: "CAC",
                  val: `R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
                  sub: "Custo por aquisição",
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="relative flex min-w-0 items-center gap-3 overflow-hidden px-4 py-3 sm:py-4 border-b last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 border-border dark:border-white/[0.08]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/15 bg-amber-500/[0.055]">
                    {k.label === "CPL" ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[18px] w-[18px] text-amber-400"
                        aria-hidden="true"
                      >
                        <circle cx="9" cy="7" r="3" />
                        <path d="M3.5 19v-2a5.5 5.5 0 0 1 11 0v2" />
                        <circle cx="18" cy="15" r="4" />
                        <path d="M18 12.8v4.4M19.4 13.7h-2a.9.9 0 0 0 0 1.8h1.2a.9.9 0 0 1 0 1.8h-2" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-[18px] w-[18px] text-amber-400"
                        aria-hidden="true"
                      >
                        <path d="M4 20V13M9 20V9M14 20V15M19 20V5" />
                        <path d="m4 9 5-3 5 4 5-6" />
                        <path d="M16 4h3v3" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">
                      {k.label}
                    </div>

                    <div className="mt-0.5 text-[21px] font-extrabold leading-tight tracking-[-0.035em] text-amber-400 tabular-nums">
                      {loading ? "—" : k.val}
                    </div>

                    <div className="mt-1 text-[11px] dark:text-[10px] text-muted-foreground/90 dark:text-muted-foreground/70 leading-snug">
                      {k.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Main area: funil + insights ── */}
          <div className={embedded ? "grid grid-cols-1 gap-3 min-w-0" : cn("grid grid-cols-1 gap-4 min-w-0", modoFunil === "quantidade" && "2xl:grid-cols-[minmax(0,1fr)_288px]")}>
            {/* Funil card */}
            <GlassCard className="cs-executive-panel">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3 border-b border-white/[0.055] pb-3">
                <h3 className="text-[15px] sm:text-[16px] font-bold uppercase tracking-[0.045em] text-foreground/95 leading-tight">
                  Funil de Conversão — {funilLabel} {/* cs-funil-tipografia-v1 */}
                </h3>
                <span className="text-[12px] text-muted-foreground uppercase tracking-[0.06em]">{periodoLabel}</span>
              </div>

              {/* Controles funcionais previstos no protótipo */}
              <div className="flex items-center gap-1 mb-4 p-1 rounded-lg border border-white/[0.07] bg-black/[0.14] w-fit max-w-full">
                {([
                  ["quantidade", "Quantidade"],
                  ["conversao", "Conversão"],
                  ["receita", "Receita"],
                ] as const).map(([valor, nome]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setModoFunil(valor)}
                    aria-pressed={modoFunil === valor}
                    className={cn(
                      "cursor-pointer rounded-md px-4 py-2 min-h-9 text-[12px] sm:text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                      modoFunil === valor
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
                    )}
                  >
                    {nome}
                  </button>
                ))}
              </div>

              <div className={modoFunil === "quantidade" ? "block" : "hidden"}>
                <FunilHorizontal
                  etapas={etapas}
                  conversoes={conversoes}
                  loading={loading}
                />
              </div>

              {modoFunil === "conversao" && (() => {
                const nomesEtapas = [
                  "Leads → MQL",
                  "MQL → Agendamento",
                  "Agendamento → Reunião",
                  "Reunião → Proposta",
                  "Proposta → Venda",
                ];

                const indicadores = conversoes.map((c, i) => ({
                  nome: nomesEtapas[i],
                  real: c.real,
                  meta: c.meta,
                  desvio: c.real - c.meta,
                }));

                const abaixo = indicadores.filter(c => c.desvio < 0);
                const acima = indicadores.filter(c => c.desvio >= 0);
                const gargaloMeta = [...abaixo].sort(
                  (a, b) => a.desvio - b.desvio
                )[0];

                const conversaoGlobal = pct(data.fechados, data.leads);

                return (
                  <div className="cs-conversao-dual-theme-v2 cs-modos-ux-v3 cs-modos-acabamento-final-v1 space-y-3 pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="cs-conversao-titulo-v3 text-[16px] font-bold text-foreground">
                          Diagnóstico de eficiência comercial
                        </h3>
                        <p className="cs-conversao-subtitulo-v3 text-[13px] text-muted-foreground mt-1">
                          Visão consolidada das metas e do desempenho do período
                        </p>
                      </div>
                    </div>

                    <div className="cs-conversao-v9-kpis grid grid-cols-1 md:grid-cols-3 gap-0 rounded-xl border border-border/70 dark:border-white/[0.09] bg-card/45 dark:bg-white/[0.015] overflow-hidden">
                      <div className="min-w-0 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-border/60 dark:border-white/[0.08]">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Relação vendas / leads
                        </p>
                        <p className="text-[32px] leading-none font-extrabold tabular-nums mt-2">
                          {loading ? "—" : `${conversaoGlobal.toFixed(1)}%`}
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-3">
                          {data.fechados} vendas e {data.leads} leads contabilizados
                        </p>
                      </div>

                      <div className="min-w-0 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-border/60 dark:border-white/[0.08]">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Etapas abaixo da meta
                        </p>
                        <p className="text-[32px] leading-none font-extrabold tabular-nums text-red-600 dark:text-red-400 mt-2">
                          {loading ? "—" : `${abaixo.length} de ${indicadores.length}`}
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-3">
                          {acima.length} etapas atingiram ou superaram a meta
                        </p>
                      </div>

                      <div className="min-w-0 p-4 sm:p-5 bg-red-500/[0.025]">
                        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Maior desvio negativo
                        </p>
                        <p className="text-[32px] leading-none font-extrabold tabular-nums text-red-600 dark:text-red-400 mt-2">
                          {loading ? "—" : gargaloMeta
                            ? `${gargaloMeta.desvio.toFixed(1)} p.p.`
                            : "Nenhum"}
                        </p>
                        <p className="text-[13px] text-muted-foreground mt-3">
                          {gargaloMeta?.nome ?? "Todas as etapas atingiram a meta"}
                        </p>
                      </div>
                    </div>

                    <div className="cs-conversao-leitura-v3 rounded-lg border-l-2 border-primary/65 bg-muted/20 dark:bg-white/[0.012] px-4 py-3">
                      <div className="flex items-start gap-3">
                        
                        <div className="min-w-0 space-y-2">
                          <h4 className="text-[13px] font-bold text-foreground">
                            Leitura executiva
                          </h4>
                          <p className="text-[13px] leading-relaxed text-muted-foreground">
                            {loading
                              ? "Atualizando indicadores..."
                              : gargaloMeta
                                ? `A transição ${gargaloMeta.nome} apresenta o maior desvio abaixo da meta (${Math.abs(gargaloMeta.desvio).toFixed(1)} pontos percentuais). Esta é a principal prioridade para investigação comercial.`
                                : "Todas as transições atingiram suas metas de conversão no período selecionado."}
                          </p>
                          <p className="text-[12px] leading-relaxed text-muted-foreground">
                            As taxas comparam volumes registrados no período.
                            Não representam necessariamente uma mesma coorte de leads.
                            O detalhamento por etapa permanece no gráfico abaixo.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {modoFunil === "receita" && (
                <div className="py-3 sm:py-4 mb-2">
                  <div className="mb-4">
                    <p className="cs-receita-titulo-executivo-v1 text-[14px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Desempenho financeiro comercial
                    </p>
                    <p className="cs-receita-subtitulo-executivo-v1 text-[13px] text-muted-foreground mt-1">
                      Vendas fechadas no período e filtros selecionados
                    </p>
                  </div>

                  {receitaErro ? (
                    <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.07] p-4">
                      <p className="font-semibold text-[15px] text-red-400">
                        Dados financeiros indisponíveis
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-2">
                        A consulta não foi concluída. O valor não será apresentado como zero.
                      </p>
                      <p className="text-[13px] text-muted-foreground mt-2 break-words">
                        {receitaErro}
                      </p>
                    </div>
                  ) : (
                    <div className="cs-receita-perola-v1 grid grid-cols-1 sm:grid-cols-3 gap-0 rounded-lg border border-white/[0.08] overflow-hidden">
                      <div className="sm:col-span-2 min-w-0 p-4 sm:p-5 border-b sm:border-b-0 sm:border-r border-white/[0.08]">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                          Receita fechada
                        </p>
                        <p className="text-[28px] sm:text-[34px] xl:text-[38px] leading-tight font-extrabold tracking-tight tabular-nums mt-3 text-foreground break-words">
                          {loading ? "—" : receitaFechada.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })}
                        </p>
                      </div>
                      <div className="min-w-0 p-4 sm:p-5">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                          Vendas fechadas
                        </p>
                        <p className="text-3xl lg:text-4xl font-extrabold tracking-tight tabular-nums mt-3">
                          {loading ? "—" : data.fechados}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-border/30 text-[13px] leading-relaxed text-muted-foreground">
                    Fonte: registros de vendas fechadas. A receita financeira
                    de cada etapa do funil ainda não está disponível.
                    Nenhum valor por etapa foi estimado.
                  </div>
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-border/30">
                
              </div>
            </GlassCard>

            {/* Insights panel — exibido no modo completo */}
            {!embedded && (
              <div className={cn("glass-card cs-executive-panel cs-executive-panel-insights cs-funil-layout-dinamico-v1 !p-5", modoFunil !== "quantidade" && "2xl:[&_.cs-insights-executivo-v1]:!grid 2xl:[&_.cs-insights-executivo-v1]:!grid-cols-3")}>
                <InsightsPanel
                  conversoes={conversoes}
                  loading={loading}
                  onInvestigar={abrirInvestigacao}
                />
              </div>
            )}
          </div>

          {!embedded && (
            <div className="cs-analises-graficos-premium-v17 grid grid-cols-1 xl:grid-cols-[45fr_30fr_25fr] gap-3 items-stretch">
              <div className="cs-analises-chart-slot-v17 min-w-0">
                <EvolucaoFunilChart
                  start={start}
                  end={end}
                  pipelineIds={pipelineIdsFiltrados}
                  funis={funisFiltrados}
                  todosSelecionados={todosSelecionados}
                />
              </div>

              <div className="cs-analises-chart-slot-v17 min-w-0">
                <ConversaoEtapasChart
                  conversoes={conversoes}
                  loading={loading}
                />
              </div>

              <div className="cs-analises-chart-slot-v17 min-w-0">
                <OrigemLeadsChart
                  start={start}
                  end={end}
                  pipelineIds={pipelineIdsFiltrados}
                  todosSelecionados={todosSelecionados}
                />
              </div>
            </div>
          )}

          {!embedded && (
            <section className="space-y-4">

              <PerformanceSDR
                funil={todosSelecionados ? undefined : funisSel}
                periodoStart={new Date(start + "T00:00:00")}
                periodoEnd={new Date(end + "T23:59:59")}
              />
            </section>
          )}
        </>
    </div>
  );
}
