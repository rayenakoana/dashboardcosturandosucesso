import { useState } from "react";
import { GlassCard } from "./GlassCard";
import { Globe2, ArrowLeft } from "lucide-react";

export interface GeoPoint {
  label: string;
  x: number;
  y: number;
  value: number;
}

interface WorldToBrazilMapProps {
  /** Leads por país. Se não informado, usa dados de exemplo. */
  countryData?: GeoPoint[];
  /** Leads por estado (BR), cruzado com DDD do telefone. */
  stateData?: GeoPoint[];
}

const DEFAULT_COUNTRIES: GeoPoint[] = [
  { label: "Brasil", x: 230, y: 190, value: 1050 },
  { label: "Paraguai", x: 210, y: 220, value: 98 },
  { label: "Portugal", x: 330, y: 100, value: 64 },
  { label: "China", x: 520, y: 130, value: 41 },
];

const DEFAULT_STATES: GeoPoint[] = [
  { label: "SP", x: 230, y: 200, value: 420 },
  { label: "MG", x: 280, y: 170, value: 180 },
  { label: "PR", x: 210, y: 230, value: 150 },
  { label: "RS", x: 200, y: 260, value: 110 },
  { label: "RJ", x: 280, y: 210, value: 95 },
];

export function WorldToBrazilMap({ countryData, stateData }: WorldToBrazilMapProps) {
  const [showStates, setShowStates] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  const countries = countryData && countryData.length > 0 ? countryData : DEFAULT_COUNTRIES;
  const states = stateData && stateData.length > 0 ? stateData : DEFAULT_STATES;

  const points = showStates ? states : countries;
  const maxValue = Math.max(...points.map((p) => p.value), 1);
  const radiusFor = (v: number) => 6 + (v / maxValue) * (showStates ? 30 : 40);

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-lg tracking-wide">
            Origem geográfica dos leads
          </h3>
        </div>
        {showStates && (
          <button
            onClick={() => setShowStates(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Mundo
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {showStates
          ? "Distribuição por estado, cruzada com o DDD do telefone"
          : "Clique no Brasil para ver a distribuição por estado"}
      </p>

      <div className="relative h-72 rounded-xl overflow-hidden bg-background/40 border border-border/50">
        <svg viewBox="0 0 640 300" className="absolute inset-0 w-full h-full">
          {Array.from({ length: 8 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 90} y1={0} x2={i * 90} y2={300} stroke="#3a3a45" strokeOpacity={0.35} />
          ))}
          {Array.from({ length: 4 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 90} x2={640} y2={i * 90} stroke="#3a3a45" strokeOpacity={0.35} />
          ))}

          {points.map((p) => {
            const r = radiusFor(p.value);
            const intensity = p.value / maxValue;
            const fill =
              intensity > 0.6
                ? "#E8384F"
                : intensity > 0.25
                ? "#B24A3A"
                : "#3a3040";
            return (
              <g key={p.label}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={fill}
                  stroke="#0D0D1A"
                  strokeWidth={1}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={() => setTooltip({ label: p.label, value: p.value, x: p.x, y: p.y })}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    if (!showStates && p.label === "Brasil") setShowStates(true);
                  }}
                />
                <text x={p.x} y={p.y - r - 6} textAnchor="middle" fontSize={10} fill="#999">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-card border border-border rounded-md px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: `${(tooltip.x / 640) * 100}%`,
              top: `${(tooltip.y / 300) * 100}%`,
              transform: "translate(12px, -12px)",
            }}
          >
            <span className="font-semibold text-foreground">{tooltip.label}</span>
            <span className="text-muted-foreground"> — {tooltip.value} leads</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-muted-foreground">menos leads</span>
        <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-muted to-primary" />
        <span className="text-[10px] text-muted-foreground">mais leads</span>
      </div>
    </GlassCard>
  );
}
