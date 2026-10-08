import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({ label, rows = 3, className }: LoadingStateProps) {
  return (
    <div className={cn("py-6 px-4", className)}>
      {label && (
        <p className="text-xs text-muted-foreground/60 mb-3">{label}</p>
      )}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-8 rounded bg-muted/40 animate-pulse"
            style={{ opacity: 1 - i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <div className="w-5 h-5 rounded-full border-2 border-border border-t-primary animate-spin" />
    </div>
  );
}
