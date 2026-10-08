import { cn } from "@/lib/utils";
import { MetricDelta } from "./MetricDelta";

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: number;
  deltaFormat?: "percent" | "absolute";
  context?: string;
  loading?: boolean;
  className?: string;
  accent?: boolean;
}

export function MetricCard({
  title,
  value,
  delta,
  deltaFormat = "percent",
  context,
  loading = false,
  className,
  accent = false,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "panel px-4 py-3 flex flex-col gap-1 min-w-0",
        accent && "border-primary/20 bg-primary/5",
        className
      )}
    >
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.1em] truncate">
        {title}
      </div>

      {loading ? (
        <div className="h-7 w-20 rounded bg-muted/50 animate-pulse mt-0.5" />
      ) : (
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className={cn(
              "font-display font-bold tabular-nums leading-none truncate",
              accent ? "text-2xl text-primary" : "text-[22px] text-foreground"
            )}
          >
            {value}
          </span>
          {delta !== undefined && (
            <MetricDelta value={delta} format={deltaFormat} className="shrink-0" />
          )}
        </div>
      )}

      {context && (
        <div className="text-[11px] text-muted-foreground/70 truncate">{context}</div>
      )}
    </div>
  );
}
