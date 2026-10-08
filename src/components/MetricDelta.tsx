import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricDeltaProps {
  value: number;
  format?: "percent" | "absolute";
  className?: string;
}

export function MetricDelta({ value, format = "percent", className }: MetricDeltaProps) {
  const isPositive = value > 0;
  const isNeutral  = value === 0;

  const label = isNeutral
    ? "—"
    : `${isPositive ? "+" : ""}${value.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}${format === "percent" ? "%" : ""}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        isNeutral  && "text-muted-foreground",
        isPositive && "text-success",
        !isPositive && !isNeutral && "text-destructive",
        className
      )}
    >
      {isNeutral  && <Minus    className="h-3 w-3 shrink-0" />}
      {isPositive && <TrendingUp   className="h-3 w-3 shrink-0" />}
      {!isPositive && !isNeutral && <TrendingDown className="h-3 w-3 shrink-0" />}
      {label}
    </span>
  );
}
