import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Erro ao carregar dados",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 px-4 text-center",
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-destructive/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {message && (
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs font-mono">{message}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-xs font-medium text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
