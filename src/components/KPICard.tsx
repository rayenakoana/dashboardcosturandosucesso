import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accent?: "red" | "gold";
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, accent = "red" }: KPICardProps) {
  const isGold = accent === "gold";
  return (
    <GlassCard hover className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">{title}</p>
          <p className={cn(
            "font-display font-bold tracking-tight text-3xl md:text-4xl leading-none",
            isGold ? "text-gradient-gold" : "text-foreground"
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              "text-xs mt-2 font-medium",
              trend === "up" && "text-emerald-400",
              trend === "down" && "text-primary",
              trend === "neutral" && "text-gold",
              !trend && "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center",
          isGold ? "bg-gold/10" : "bg-primary/10"
        )}>
          <Icon className={cn("h-5 w-5", isGold ? "text-gold" : "text-primary")} />
        </div>
      </div>
      <div className={cn(
        "pointer-events-none absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-40",
        isGold ? "bg-gold/20" : "bg-primary/20"
      )} />
    </GlassCard>
  );
}
