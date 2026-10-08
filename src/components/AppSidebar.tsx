import { useState, useEffect, useCallback } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3, GitMerge, Map, ShoppingCart, TrendingUp,
  Radio, Target, DollarSign, Settings, Users,
  ChevronDown, PanelLeftClose, PanelLeft,
  LogOut, Sun, Moon, Maximize, Minimize,
  UserCheck, BarChart2, Instagram, MessageCircle, Mail,
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
  /** When set, active state also requires ?tab=<value> */
  tab?: string;
  /** When true, active when pathname matches and no tab param (or tab=meta) */
  defaultTab?: boolean;
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
      { label: "Dashboard",       url: "/",     icon: BarChart3, end: true },
      { label: "Mapa Geográfico", url: "/mapa", icon: Map },
      { label: "CS Live",         url: "/live", icon: Radio },
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    collapsible: true,
    items: [
      { label: "Funil Comercial", url: "/funil-xpto?tab=funil", icon: GitMerge,    tab: "funil" },
      { label: "SDRs",            url: "/funil-xpto?tab=sdr",   icon: UserCheck,   tab: "sdr"   },
      { label: "Vendas",          url: "/admin/comercial",       icon: ShoppingCart, protected: true },
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    collapsible: true,
    items: [
      { label: "Instagram",        url: "/marketing?tab=instagram", icon: Instagram,     tab: "instagram" },
      { label: "WPP Campanhas",    url: "/marketing?tab=wpp",       icon: MessageCircle, tab: "wpp"       },
      { label: "Meta Ads",         url: "/marketing",               icon: BarChart2,     defaultTab: true },
      { label: "E-mail Marketing", url: "/marketing?tab=email",     icon: Mail,          tab: "email"     },
    ],
  },
  {
    key: "gestao",
    label: "Gestão",
    protected: true,
    items: [
      { label: "Metas",            url: "/admin/metas",         icon: Target     },
      { label: "Custos Marketing", url: "/admin/marketing",     icon: DollarSign },
    ],
  },
  {
    key: "sistema",
    label: "Sistema",
    protected: true,
    items: [
      { label: "Configurações", url: "/admin/configuracoes", icon: Settings },
      { label: "Usuários",      url: "/admin/usuarios",      icon: Users    },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readLSObj<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function useIsItemActive(item: NavItemDef): boolean {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentTab = params.get("tab");

  const basePath = item.url.split("?")[0];
  const pathMatches = item.end
    ? location.pathname === basePath
    : location.pathname === basePath;

  if (!pathMatches) return false;
  if (item.tab) return currentTab === item.tab;
  if (item.defaultTab) return !currentTab || currentTab === "meta";
  return true;
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({ item, collapsed }: { item: NavItemDef; collapsed: boolean }) {
  const isActive = useIsItemActive(item);
  const Icon = item.icon;

  const link = (
    <NavLink
      to={item.url}
      end={item.end}
      className={() =>
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
      {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="text-xs font-medium">
          {item.label}
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768
  );

  // Mobile detection — auto-collapse on mount and on resize
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Auto-close sidebar on navigation when mobile
  useEffect(() => {
    if (isMobile) setIsCollapsed(true);
  }, [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for open event fired by Topbar hamburger
  const handleOpenEvent = useCallback(() => {
    if (window.innerWidth < 768) setIsCollapsed(false);
  }, []);
  useEffect(() => {
    window.addEventListener("cs-sidebar:open", handleOpenEvent);
    return () => window.removeEventListener("cs-sidebar:open", handleOpenEvent);
  }, [handleOpenEvent]);

  // Escape key closes sidebar on mobile
  useEffect(() => {
    if (!isMobile) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCollapsed) setIsCollapsed(true);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isMobile, isCollapsed]);

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
  const userAvatarUrl: string | null =
    user
      ? (() => { try { return localStorage.getItem("avatar_" + user.id); } catch { return null; } })()
        ?? user.user_metadata?.avatar_url
        ?? null
      : null;

  return (
    <>
    {/* Mobile backdrop */}
    {isMobile && !isCollapsed && (
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={() => setIsCollapsed(true)}
        aria-hidden="true"
      />
    )}
    <aside
      className={cn(
        "flex flex-col shrink-0 border-r border-sidebar-border bg-sidebar h-screen overflow-hidden",
        "sidebar-transition",
        isMobile
          ? cn("fixed top-0 left-0 z-50 w-[220px]", isCollapsed ? "-translate-x-full" : "translate-x-0")
          : cn("sticky top-0 z-30", isCollapsed ? "w-[52px]" : "w-[220px]")
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
                <Link
                  to="/admin/perfil"
                  className="shrink-0"
                  aria-label="Meu perfil"
                >
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary cursor-pointer select-none">
                      {userInitials}
                    </div>
                  )}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={10}>
                  {user.user_metadata?.full_name || user.email}
                </TooltipContent>
              )}
            </Tooltip>

            {!isCollapsed && (
              <>
                <Link to="/admin/perfil" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <div className="text-[11px] font-medium text-sidebar-foreground truncate">
                    {user.user_metadata?.full_name || user.email}
                  </div>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); void handleSignOut(); }}
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
    </>
  );
}
