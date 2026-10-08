import React, { useMemo, useRef, useState, useEffect } from "react";
import { Users, UserCheck, CalendarCheck, Users2, FileText, TrendingUp } from "lucide-react";

// ─── Scale function ────────────────────────────────────────────────────────────
// Square-root scale: monotonic, ESCALA VISUAL — not area-proportional.
// v > vMax (non-monotonic): halfH > maxHalf → funnel widens intentionally.
// v < 0 treated as 0 (anomaly guard, no direction clamping).
export function funnelHalfH(
  v: number,
  vMax: number,
  maxHalf: number,
  minHalf: number,
): number {
  if (vMax <= 0) return minHalf;
  const safe = Math.max(v, 0);
  if (safe === 0) return minHalf;
  return minHalf + (maxHalf - minHalf) * Math.sqrt(safe / vMax);
}

// ─── Animation hook ────────────────────────────────────────────────────────────
function useAnimatedBoundaries(
  targets: number[],
  duration: number,
  enabled: boolean,
): number[] {
  const [current, setCurrent] = useState<number[]>(targets);
  const fromRef   = useRef<number[]>(targets);
  const rafRef    = useRef<number | null>(null);
  const startRef  = useRef<number | null>(null);
  const targetRef = useRef<number[]>(targets);
  const key       = targets.join(",");

  useEffect(() => {
    targetRef.current = targets;

    if (!enabled) {
      setCurrent(targets);
      fromRef.current = targets;
      return;
    }

    fromRef.current = current;
    startRef.current = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const from = fromRef.current;
      const to   = targetRef.current;
      const next = from.map((f, i) => f + ((to[i] ?? f) - f) * eased);
      setCurrent(next);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = to;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return current;
}

// ─── SVG constants ─────────────────────────────────────────────────────────────
const SVG_W    = 700;
const SVG_H    = 190;
const CENTER_Y = 95;
const MAX_HALF = 82;
const MIN_HALF = 20;

// ─── Color palette ─────────────────────────────────────────────────────────────
// Base → lighter top → darker bottom  (crimson to deep maroon)
const PALETTE: { base: string; top: string; btm: string }[] = [
  { base: "#F7304E", top: "#FF6070", btm: "#CC1C36" },
  { base: "#D72343", top: "#E84057", btm: "#AF1A34" },
  { base: "#B21D38", top: "#C8334B", btm: "#8E142A" },
  { base: "#90192F", top: "#A83041", btm: "#6E0E1F" },
  { base: "#711526", top: "#8A2C3C", btm: "#530A18" },
  { base: "#51111E", top: "#6A2230", btm: "#370A13" },
];

// ─── Icons ─────────────────────────────────────────────────────────────────────
const STAGE_ICONS = [Users, UserCheck, CalendarCheck, Users2, FileText, TrendingUp];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function pts(i: number, sw: number, b: number[], cy: number): string {
  const xL = i * sw;
  const xR = (i + 1) * sw;
  const hL = b[i]   ?? MIN_HALF;
  const hR = b[i+1] ?? MIN_HALF;
  return [
    [xL, cy - hL],
    [xR, cy - hR],
    [xR, cy + hR],
    [xL, cy + hL],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

// ─── Props ─────────────────────────────────────────────────────────────────────
export interface FunilStage {
  label: string;
  shortLabel?: string;
  val: number;
  pctDeTopo: number;
}

interface FunilSVGCoreProps {
  stages: FunilStage[];
  loading?: boolean;
  reduceMotion?: boolean;
  /** Show icon + label strip below SVG (for demo / standalone use) */
  showLabelStrip?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function FunilSVGCore({
  stages,
  loading = false,
  reduceMotion = false,
  showLabelStrip = false,
}: FunilSVGCoreProps) {
  const n    = stages.length;
  const vals = stages.map((s) => s.val);
  const vMax = vals[0] > 0 ? vals[0] : Math.max(...vals, 1);

  const targetBounds = useMemo<number[]>(() => {
    const b = vals.map((v) => funnelHalfH(v, vMax, MAX_HALF, MIN_HALF));
    // Last cap: keep same as last stage boundary (makes rectangle at end when v=0)
    b.push(funnelHalfH(vals[n - 1], vMax, MAX_HALF, MIN_HALF));
    return b;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals.join(","), vMax]);

  const boundaries = useAnimatedBoundaries(targetBounds, 640, !loading && !reduceMotion);
  const sw = SVG_W / n;

  const nonMonotonic = vals.map((v, i) => i > 0 && v > vals[i - 1]);
  const hasNM = nonMonotonic.some(Boolean);

  // Outer contour path (traces entire funnel silhouette)
  const topEdge = Array.from({ length: n + 1 }, (_, i) =>
    `${(i * sw).toFixed(2)},${(CENTER_Y - (boundaries[i] ?? MIN_HALF)).toFixed(2)}`
  );
  const botEdge = Array.from({ length: n + 1 }, (_, i) =>
    `${((n - i) * sw).toFixed(2)},${(CENTER_Y + (boundaries[n - i] ?? MIN_HALF)).toFixed(2)}`
  );
  const outerD = `M ${topEdge.join(" L ")} L ${botEdge.join(" L ")} Z`;

  return (
    <div style={{ width: "100%", position: "relative", fontFamily: "inherit" }}>

      {/* Non-monotonic warning */}
      {hasNM && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10, color: "#fbbf24", marginBottom: 8,
          padding: "5px 10px", borderRadius: 6,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
        }}>
          <span>⚠</span>
          <span style={{ opacity: 0.8 }}>
            Etapas com volumes não sequenciais — verificar critérios de apuração.
          </span>
        </div>
      )}

      {/* ── SVG Funnel ── */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Funil comercial — escala visual por raiz quadrada"
        role="img"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Per-stage vertical gradient: top lighter → base → bottom darker */}
          {PALETTE.map((p, i) => (
            <linearGradient key={i} id={`fsg-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={p.top}  />
              <stop offset="45%"  stopColor={p.base} />
              <stop offset="100%" stopColor={p.btm}  />
            </linearGradient>
          ))}
          {/* Loading shimmer gradient */}
          <linearGradient id="fsg-load" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#1E2530" />
            <stop offset="50%"  stopColor="#26303C" />
            <stop offset="100%" stopColor="#1E2530" />
          </linearGradient>
          {/* Clip for left-edge glow fade */}
          <clipPath id="fsg-main-clip">
            <rect x="0" y="0" width={SVG_W} height={SVG_H} />
          </clipPath>
        </defs>

        {/* ── Stage fills ── */}
        {stages.map((_, i) => (
          <polygon
            key={i}
            points={pts(i, sw, boundaries, CENTER_Y)}
            fill={loading ? "url(#fsg-load)" : `url(#fsg-${Math.min(i, PALETTE.length - 1)})`}
            stroke="none"
          />
        ))}

        {/* ── Outer unified contour ── */}
        <path
          d={outerD}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* ── Top highlight strip ── */}
        <polyline
          points={topEdge.join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.30)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* ── Bottom shadow strip ── */}
        <polyline
          points={Array.from({ length: n + 1 }, (_, i) =>
            `${(i * sw).toFixed(2)},${(CENTER_Y + (boundaries[i] ?? MIN_HALF)).toFixed(2)}`
          ).join(" ")}
          fill="none"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* ── Left-edge highlight (stage 0 entrance) ── */}
        <line
          x1="0" y1={(CENTER_Y - (boundaries[0] ?? MIN_HALF)).toFixed(2)}
          x2="0" y2={(CENTER_Y + (boundaries[0] ?? MIN_HALF)).toFixed(2)}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
        />

        {/* ── Vertical dividers between stages ── */}
        {Array.from({ length: n - 1 }, (_, i) => {
          const x = ((i + 1) * sw).toFixed(2);
          const h = boundaries[i + 1] ?? MIN_HALF;
          return (
            <line
              key={i}
              x1={x} y1={(CENTER_Y - h).toFixed(2)}
              x2={x} y2={(CENTER_Y + h).toFixed(2)}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1"
            />
          );
        })}

        {/* ── Non-monotonic stage indicator ── */}
        {nonMonotonic.map((nm, i) =>
          nm ? (
            <polygon
              key={i}
              points={pts(i, sw, boundaries, CENTER_Y)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              opacity="0.7"
            />
          ) : null
        )}

        {/* ── Text overlays ── */}
        {stages.map((stage, i) => {
          const cx  = (i + 0.5) * sw;
          const hL  = boundaries[i]     ?? MIN_HALF;
          const hR  = boundaries[i + 1] ?? MIN_HALF;
          const avg = (hL + hR) / 2;

          // Responsive font sizing based on available stage height
          const numSz  = avg > 44 ? 22 : avg > 32 ? 18 : avg > 22 ? 14 : 11;
          const showLbl = avg > 25;
          const showPct = avg > 35;
          const showVal = avg > 14; // always show number if there's any space

          // Vertical centering: push number up when label follows
          const numY = showLbl
            ? CENTER_Y - (avg > 35 ? 6 : 4)
            : CENTER_Y + numSz * 0.35;

          if (loading) {
            // Loading placeholder bars
            const barW = Math.min(sw * 0.55, 40);
            return (
              <g key={i} opacity="0.25">
                <rect
                  x={cx - barW / 2} y={CENTER_Y - 8}
                  width={barW} height={10} rx="3"
                  fill="rgba(255,255,255,0.5)"
                />
              </g>
            );
          }

          return (
            <g key={i}>
              {showVal && (
                <text
                  x={cx.toFixed(2)}
                  y={numY.toFixed(2)}
                  textAnchor="middle"
                  fontSize={numSz}
                  fontWeight="800"
                  fill="white"
                  style={{ fontFamily: "inherit", letterSpacing: "-0.02em" }}
                >
                  {stage.val}
                </text>
              )}
              {showLbl && (
                <text
                  x={cx.toFixed(2)}
                  y={(CENTER_Y + (avg > 35 ? 11 : 9)).toFixed(2)}
                  textAnchor="middle"
                  fontSize={avg > 40 ? 8.5 : 7.5}
                  fill="#F4CDD3"
                  opacity="0.82"
                  style={{ fontFamily: "inherit" }}
                >
                  {stage.shortLabel ?? stage.label}
                </text>
              )}
              {showPct && (
                <text
                  x={cx.toFixed(2)}
                  y={(CENTER_Y + 24).toFixed(2)}
                  textAnchor="middle"
                  fontSize="7"
                  fill="rgba(255,255,255,0.35)"
                  style={{ fontFamily: "inherit" }}
                >
                  {i === 0
                    ? (vals[0] > 0 ? "100%" : "N/D")
                    : vMax > 0
                    ? `${stage.pctDeTopo.toFixed(1)}%`
                    : "N/D"}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Scale annotation ── */}
        <text
          x={SVG_W - 4} y={SVG_H - 3}
          textAnchor="end" fontSize="5.5"
          fill="rgba(255,255,255,0.15)"
          style={{ fontFamily: "inherit" }}
        >
          ESCALA VISUAL √
        </text>
      </svg>

      {/* ── Optional label strip with icons (for demo / standalone) ── */}
      {showLabelStrip && (
        <div style={{ display: "flex", marginTop: 8, gap: 0 }}>
          {stages.map((stage, i) => {
            const Icon = STAGE_ICONS[i];
            const col  = PALETTE[Math.min(i, PALETTE.length - 1)];
            const isNM = nonMonotonic[i];
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "6px 2px 2px",
                  borderTop: `2px solid ${col.base}55`,
                  minWidth: 0,
                }}
              >
                {Icon && (
                  <Icon
                    style={{
                      width: 12, height: 12,
                      color: col.base,
                      opacity: 0.55,
                      marginBottom: 3,
                      display: "block",
                      margin: "0 auto 3px",
                    }}
                  />
                )}
                <div style={{
                  fontSize: loading ? 12 : 16,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "white",
                  marginBottom: 2,
                }}>
                  {loading ? <span style={{ opacity: 0.2 }}>—</span> : stage.val}
                </div>
                <div style={{
                  fontSize: 8.5,
                  color: "#9BA5B4",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {stage.shortLabel ?? stage.label}
                  {isNM && (
                    <span style={{ color: "#fbbf24", marginLeft: 2 }}>↑</span>
                  )}
                </div>
                <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>
                  {loading ? "" : (
                    i === 0 ? (vals[0] > 0 ? "100%" : "N/D")
                    : vMax > 0 ? `${stage.pctDeTopo.toFixed(1)}%`
                    : "N/D"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
