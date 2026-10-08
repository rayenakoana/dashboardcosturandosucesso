import { cn } from "@/lib/utils";

interface DataPanelProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  noPadding?: boolean;
}

export function DataPanel({ children, className, elevated = false, noPadding = false }: DataPanelProps) {
  return (
    <div
      className={cn(
        elevated ? "panel-elevated" : "panel",
        !noPadding && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
