import { useLocation } from "react-router-dom";
import { ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Route metadata ────────────────────────────────────────────────────────────

interface RouteMeta {
  label: string;
  parent?: string;
}

const ROUTE_META: Record<string, RouteMeta> = {
  "/":                    { label: "Dashboard" },
  "/funil-xpto":          { label: "Funil & Performance",  parent: "Comercial" },
  "/mapa":                { label: "Mapa Geográfico",       parent: "Comercial" },
  "/marketing":           { label: "Visão de Marketing",   parent: "Marketing" },
  "/live":                { label: "CS Live" },
  "/admin/comercial":     { label: "Vendas",                parent: "Comercial" },
  "/admin/metas":         { label: "Metas",                 parent: "Gestão" },
  "/admin/marketing":     { label: "Custos de Marketing",   parent: "Gestão" },
  "/admin/configuracoes": { label: "Configurações",         parent: "Sistema" },
  "/admin/usuarios":      { label: "Usuários",              parent: "Sistema" },
  "/admin/input-diario":  { label: "Input Diário",          parent: "Gestão" },
  "/admin/safras":        { label: "Gestão de Safras",      parent: "Gestão" },
};

// ── Topbar ────────────────────────────────────────────────────────────────────

export function Topbar() {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname];

  if (!meta) return null;

  return (
    <header
      className={cn(
        "h-10 shrink-0 flex items-center px-4 border-b border-border/60",
        "bg-background/80 backdrop-blur-sm sticky top-0 z-20"
      )}
    >
      {/* Hamburger — mobile only */}
      <button
        className="md:hidden mr-2 p-1.5 rounded-md text-muted-foreground hover:bg-muted/30 transition-colors shrink-0"
        aria-label="Abrir menu de navegação"
        onClick={() => window.dispatchEvent(new CustomEvent("cs-sidebar:open"))}
      >
        <Menu className="h-4 w-4" />
      </button>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground/70 min-w-0" aria-label="Breadcrumb">
        <span className="shrink-0 font-medium text-muted-foreground/40 hidden sm:block">CS Dash</span>
        {meta.parent && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 hidden sm:block" />
            <span className="shrink-0 hidden sm:block">{meta.parent}</span>
          </>
        )}
        <ChevronRight className="h-3 w-3 shrink-0 hidden sm:block" />
        <span className="font-medium text-foreground truncate">{meta.label}</span>
      </nav>
    </header>
  );
}
