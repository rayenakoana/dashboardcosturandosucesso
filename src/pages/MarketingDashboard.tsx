import { useState } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { MarketingSection } from "@/components/MarketingSection";
import { cn } from "@/lib/utils";

type Period = "7d" | "15d" | "30d" | "90d" | "custom";

interface PeriodOption { label: string; value: Period }

const PERIODS: PeriodOption[] = [
  { label: "Últimos 7 dias",  value: "7d"  },
  { label: "Últimos 15 dias", value: "15d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 90 dias", value: "90d" },
  { label: "Personalizado",   value: "custom" },
];

function getRange(period: Period, customStart: string, customEnd: string): { start: string; end: string } {
  const today = new Date().toISOString().split("T")[0];
  const sub = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };
  if (period === "7d")  return { start: sub(6),  end: today };
  if (period === "15d") return { start: sub(14), end: today };
  if (period === "30d") return { start: sub(29), end: today };
  if (period === "90d") return { start: sub(89), end: today };
  return { start: customStart || sub(29), end: customEnd || today };
}

export default function MarketingDashboard() {
  const [period, setPeriod]           = useState<Period>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [dropOpen, setDropOpen]       = useState(false);

  const { start, end } = getRange(period, customStart, customEnd);

  const selectedLabel = PERIODS.find(p => p.value === period)?.label ?? "Período";

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground">
            Marketing
          </h1>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            — Performance de canais
          </span>
        </div>

        {/* Filtro de período */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setDropOpen(v => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                "border-border bg-card/60 hover:bg-card text-foreground"
              )}
            >
              {selectedLabel}
              <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", dropOpen && "rotate-180")} />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-popover shadow-xl py-1">
                {PERIODS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setPeriod(opt.value); setDropOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                      period === opt.value
                        ? "text-primary bg-primary/8"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Datas customizadas */}
          {period === "custom" && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-[10px] text-muted-foreground">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-border bg-card/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Badge do período ativo */}
          <span className="text-[10px] text-muted-foreground border border-border/60 rounded-md px-2 py-1 font-mono">
            {start} → {end}
          </span>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <MarketingSection from={start} to={end} />
    </div>
  );
}
