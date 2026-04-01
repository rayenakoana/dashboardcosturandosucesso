import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

export function KPICard({ title, value, subtitle, icon: Icon, trend }: KPICardProps) {
  return (
    <GlassCard hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className={cn(
              "text-xs mt-1",
              trend === "up" && "text-green-400",
              trend === "down" && "text-red-400",
              trend === "neutral" && "text-muted-foreground"
            )}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-primary/5 rounded-tl-full" />
    </GlassCard>
  );
}
