import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger:  "bg-destructive/10 text-destructive border-destructive/20",
  info:    "bg-info/10 text-info border-info/20",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/20",
};

const dotClasses: Record<StatusVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger:  "bg-destructive",
  info:    "bg-info",
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
};

export function StatusBadge({ label, variant = "neutral", dot = false, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClasses[variant])} />
      )}
      {label}
    </span>
  );
}
