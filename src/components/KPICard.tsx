import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accent?: "red" | "gold";
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, accent = "red" }: KPICardProps) {
  const isGold = accent === "gold";
  return (
    <GlassCard hover className="!p-5 min-h-[132px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3">{title}</p>
        {Icon && (
          <div className={cn("shrink-0 h-9 w-9 rounded-xl flex items-center justify-center", isGold ? "bg-gold/10" : "bg-primary/10")}>
            <Icon className={cn("h-4 w-4", isGold ? "text-gold" : "text-primary")} />
          </div>
        )}
      </div>
      <p className={cn(
        "font-display font-bold tracking-tight text-2xl lg:text-[28px] leading-tight break-words",
        isGold ? "text-gradient-gold" : "text-foreground"
      )}>
        {value}
      </p>
      {subtitle && (
        <p className={cn(
          "text-[11px] mt-2 leading-relaxed",
          trend === "up" && "text-emerald-400",
          trend === "down" && "text-primary",
          trend === "neutral" && "text-gold",
          !trend && "text-muted-foreground"
        )}>
          {subtitle}
        </p>
      )}
    </GlassCard>
  );
}
