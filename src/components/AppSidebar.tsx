import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3, GitMerge, Map, ShoppingCart, TrendingUp,
  Radio, Target, DollarSign, Settings, Users,
  ChevronDown, PanelLeftClose, PanelLeft,
  LogOut, Sun, Moon, Maximize, Minimize,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Types ────────────────────────────────────────────────────────────────────

interface NavItemDef {
  label: string;
  url: string;
  icon: React.ElementType;
  end?: boolean;
  protected?: boolean;
}

interface NavGroupDef {
  key: string;
  label: string;
  collapsible?: boolean;
  protected?: boolean;
  items: NavItemDef[];
}

// ── Navigation map ────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroupDef[] = [
  {
    key: "overview",
    label: "Visão Geral",
    items: [
      { label: "Dashboard", url: "/", icon: BarChart3, end: true },
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    collapsible: true,
    items: [
      { label: "Funil & Performance", url: "/funil-xpto", icon: GitMerge },
      { label: "Mapa Geográfico",      url: "/mapa",        icon: Map },
      { label: "Vendas",               url: "/admin/comercial", icon: ShoppingCart, protected: true },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    collapsible: true,
    items: [
      { label: "Visão de Marketing", url: "/marketing", icon: TrendingUp },
    ],
  },
  {
    key: "live",
    label: "Tempo Real",
    items: [
      { label: "CS Live", url: "/live", icon: Radio },
    ],
  },
  {
    key: "gestao",
    label: "Gestão",
    protected: true,
    items: [
      { label: "Metas",             url: "/admin/metas",     icon: Target },
      { label: "Custos Marketing",  url: "/admin/marketing", icon: DollarSign },
    ],
  },
  {
    key: "sistema",
    label: "Sistema",
    protected: true,
    items: [
      { label: "Configurações", url: "/admin/configuracoes", icon: Settings },
      { label: "Usuários",      url: "/admin/usuarios",      icon: Users },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLS(key: string, fallback: boolean): boolean {
  try { return localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === "true"; }
  catch { return fallback; }
}

function readLSObj(key: string, fallback: Record<string, boolean>): Record<string, boolean> {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

// ── NavItem ───────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: NavItemDef;
  collapsed: boolean;
}

function NavItem({ item, collapsed }: NavItemProps) {
  const { url, icon: Icon, label, end } = item;

  const link = (
    <NavLink
      to={url}
      end={end}
      className={({ isActive }) =>
        cn(
          "relative flex items-center rounded-md transition-colors select-none outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/50",
          collapsed
            ? "justify-center w-full p-2"
            : "gap-2.5 px-3 py-1.5",
          isActive
            ? cn(
                "bg-primary/10 text-primary font-medium",
                !collapsed && "nav-active-bar"
              )
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        )
      }
    >
      <Icon className="shrink-0 w-[15px] h-[15px]" />
      {!collapsed && <span className="truncate text-[13px]">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ── NavGroup ──────────────────────────────────────────────────────────────────

interface NavGroupProps {
  group: NavGroupDef;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}

function NavGroup({ group, collapsed, open, onToggle }: NavGroupProps) {
  const isCollapsible = group.collapsible && !collapsed;

  return (
    <div className="space-y-0.5">
      {/* Group label */}
      {collapsed ? (
        <div className="mx-2 my-2 border-t border-sidebar-border/60" />
      ) : (
        <button
          onClick={isCollapsible ? onToggle : undefined}
          className={cn(
            "w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50 select-none",
            isCollapsible && "cursor-pointer hover:text-muted-foreground/80 transition-colors"
          )}
          tabIndex={isCollapsible ? 0 : -1}
          aria-expanded={isCollapsible ? open : undefined}
        >
          <span>{group.label}</span>
          {isCollapsible && (
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-[var(--dur-normal)]",
                !open && "-rotate-90"
              )}
            />
          )}
        </button>
      )}

      {/* Group items */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height] duration-[var(--dur-normal)] ease-[var(--ease-ui)]",
          !collapsed && isCollapsible
            ? open ? "max-h-96" : "max-h-0"
            : "max-h-96"
        )}
      >
        <div className={cn("space-y-0.5", !collapsed && "px-1")}>
          {group.items.map((item) => (
            <NavItem key={item.url} item={item} collapsed={collapsed} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isCollapsed, setIsCollapsed] = useState(() => readLS("cs-dash-sidebar-collapsed", false));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    readLSObj("cs-dash-nav-groups", { comercial: true, marketing: true, gestao: true, sistema: true })
  );

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("cs-dash-sidebar-collapsed", String(isCollapsed)); } catch {}
  }, [isCollapsed]);

  useEffect(() => {
    try { localStorage.setItem("cs-dash-nav-groups", JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const visibleGroups = NAV_GROUPS.filter(
    (g) => !g.protected || user
  ).map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.protected || user),
  })).filter((g) => g.items.length > 0);

  const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar h-screen sticky top-0 overflow-hidden z-30",
        "sidebar-transition",
        isCollapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center border-b border-sidebar-border shrink-0",
          isCollapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-3"
        )}
      >
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center font-display font-bold text-sm text-primary hover:bg-primary/20 transition-colors"
                aria-label="Expandir sidebar"
              >
                CS
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>CS Dash</TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center font-display font-bold text-xs text-white shrink-0">
                CS
              </div>
              <div className="min-w-0">
                <div className="text-sm font-display font-bold text-foreground leading-none tracking-wide">
                  CS <span className="text-primary">DASH</span>
                </div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-0.5">
                  Costurando Sucesso
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors shrink-0"
              aria-label="Recolher sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Nav ── */}
      <nav
        className={cn("flex-1 overflow-y-auto overflow-x-hidden py-2", isCollapsed ? "px-1.5" : "px-2")}
        aria-label="Navegação principal"
      >
        <div className="space-y-1">
          {visibleGroups.map((group) => (
            <NavGroup
              key={group.key}
              group={group}
              collapsed={isCollapsed}
              open={openGroups[group.key] ?? true}
              onToggle={() => toggleGroup(group.key)}
            />
          ))}
        </div>
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-sidebar-border shrink-0 py-2 px-1.5 space-y-1">
        {/* Controls row */}
        <div className={cn("flex gap-1", isCollapsed ? "flex-col items-center" : "items-center flex-wrap px-1")}>
          {/* Theme */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
                className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors"
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "top"} sideOffset={8}>
              {theme === "dark" ? "Tema claro" : "Tema escuro"}
            </TooltipContent>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors"
              >
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side={isCollapsed ? "right" : "top"} sideOffset={8}>
              {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            </TooltipContent>
          </Tooltip>

          {/* Expand (only when collapsed) */}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsCollapsed(false)}
                  aria-label="Expandir sidebar"
                  className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <PanelLeft className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Expandir</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* User row */}
        {user ? (
          <div className={cn("flex items-center rounded-md px-1.5 py-1.5 gap-2", isCollapsed && "justify-center px-0")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 cursor-default select-none">
                  {userInitials}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={10}>
                  {user.email}
                </TooltipContent>
              )}
            </Tooltip>

            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-sidebar-foreground truncate">{user.email}</div>
                </div>
                <button
                  onClick={handleSignOut}
                  aria-label="Sair"
                  className="p-1 rounded-md text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ) : (
          <NavLink
            to="/login"
            className={cn(
              "flex items-center gap-2 px-1.5 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-[15px] h-[15px] shrink-0" />
            {!isCollapsed && <span>Entrar</span>}
          </NavLink>
        )}
      </div>
    </aside>
  );
}
