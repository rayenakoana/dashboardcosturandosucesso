import { useEffect, useState } from "react";
import { GlassCard } from "./GlassCard";
import { Globe2 } from "lucide-react";

/**
 * Decorative map: animates a slow zoom from a world/globe icon towards Brazil,
 * highlighting the geographic origin of leads. SVG-based, no external deps.
 */
export function WorldToBrazilMap() {
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setZoomed((z) => !z), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Globe2 className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold text-lg tracking-wide">Origem geográfica dos leads</h3>
      </div>
      <div className="relative h-64 rounded-xl overflow-hidden bg-background/40 border border-border/50">
        <svg
          viewBox="0 0 800 400"
          className="absolute inset-0 w-full h-full transition-transform duration-[3000ms] ease-in-out"
          style={{
            transform: zoomed ? "scale(3.4) translate(-8%, -6%)" : "scale(1) translate(0,0)",
            transformOrigin: "34% 62%",
          }}
        >
          <defs>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(355 82% 51%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(355 82% 51%)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(240 15% 18%)" />
              <stop offset="100%" stopColor="hsl(240 20% 10%)" />
            </linearGradient>
            <linearGradient id="brGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(355 82% 55%)" />
              <stop offset="100%" stopColor="hsl(355 72% 31%)" />
            </linearGradient>
          </defs>

          {/* Simplified continents silhouette */}
          <g fill="url(#landGrad)" stroke="hsl(240 15% 22%)" strokeWidth="0.5">
            {/* North America */}
            <path d="M60 90 L180 70 L230 130 L200 200 L120 210 L80 170 Z" />
            {/* South America (Brazil area highlighted separately) */}
            <path d="M220 220 L280 210 L300 260 L280 340 L230 350 L200 300 Z" />
            {/* Europe */}
            <path d="M370 90 L430 80 L450 130 L410 160 L370 140 Z" />
            {/* Africa */}
            <path d="M400 170 L460 165 L470 260 L430 320 L400 260 Z" />
            {/* Asia */}
            <path d="M470 80 L680 70 L720 160 L650 200 L500 180 L470 140 Z" />
            {/* Australia */}
            <path d="M640 280 L720 275 L740 320 L680 335 L640 315 Z" />
          </g>

          {/* Brazil highlighted */}
          <path
            d="M235 225 L275 218 L295 255 L285 305 L260 340 L230 335 L215 300 L220 260 Z"
            fill="url(#brGrad)"
            stroke="hsl(355 82% 60%)"
            strokeWidth="1"
          />

          {/* Pulsing glow over Brazil */}
          <circle cx="260" cy="285" r="45" fill="url(#glow)">
            <animate attributeName="r" values="30;55;30" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Origin markers */}
          {[
            { x: 245, y: 260, r: 3 },
            { x: 268, y: 280, r: 4 },
            { x: 255, y: 305, r: 3 },
            { x: 240, y: 295, r: 2.5 },
            { x: 275, y: 320, r: 3 },
          ].map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={p.r} fill="hsl(45 78% 54%)" />
              <circle cx={p.x} cy={p.y} r={p.r * 2} fill="hsl(45 78% 54%)" opacity="0.3">
                <animate attributeName="r" values={`${p.r};${p.r * 3};${p.r}`} dur="2.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            </g>
          ))}
        </svg>

        <div className="absolute bottom-3 left-3 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Brasil
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-gold" /> Origens
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
