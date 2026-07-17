import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, Settings, DollarSign, ShoppingCart, Layers,
  CalendarPlus, Target, Radio, Maximize, Minimize, GitMerge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const items = [
  { title: "Dashboard",    url: "/",              icon: BarChart3 },
  { title: "Funil XPTO",  url: "/funil-xpto",    icon: GitMerge },
  { title: "Comercial",   url: "/vendas",         icon: ShoppingCart },
  { title: "Input Diário", url: "/input-diario",  icon: CalendarPlus },
  { title: "Safras",      url: "/safras",         icon: Layers },
  { title: "Marketing",   url: "/custos",         icon: DollarSign },
  { title: "Metas",       url: "/metas",          icon: Target },
  { title: "Live",        url: "/live",           icon: Radio },
  { title: "Config",      url: "/configuracoes",  icon: Settings },
];

const FULLSCREEN_PAGES = ["/", "/funil-xpto", "/live"];

export function TopNav() {
  const { pathname } = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const showFullscreen = FULLSCREEN_PAGES.includes(pathname);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-red flex items-center justify-center font-display font-bold text-lg text-white glow-red">
            CS
          </div>
          <div className="hidden sm:block">
            <div className="font-display font-bold text-xl leading-none tracking-wide">
              <span className="text-gradient">CS</span>
              <span className="text-foreground"> DASH</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              Costurando Sucesso
            </div>
          </div>
        </NavLink>

        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {items.map(({ title, url, icon: Icon }) => {
            const active = url === "/" ? pathname === "/" : pathname.startsWith(url);
            return (
              <NavLink key={url} to={url} title={title}
                className={cn(
                  "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  active
                    ? "text-white bg-gradient-red shadow-[0_4px_20px_hsl(355_82%_51%/0.35)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{title}</span>
              </NavLink>
            );
          })}
        </nav>

        {showFullscreen && (
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all text-xs font-medium shrink-0"
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Minimizar" : "Tela cheia"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
