import React, { useEffect, useRef, useState } from "react";

// ── Scale function ────────────────────────────────────────────────────────────
// Square-root scale: monotonic, non-linear, v=0→minHalf, vMax→maxHalf.
// ESCALA VISUAL — not area-proportional.
// If v > vMax (non-monotonic data), halfH exceeds maxHalf → funnel widens intentionally.
// v < 0 is treated as 0 (data anomaly guard, no direction clamping).
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

// ── Animation hook ────────────────────────────────────────────────────────────
function useAnimatedBoundaries(
  targets: number[],
  duration: number,
  enabled: boolean,
): number[] {
  const [current, setCurrent] = useState<number[]>(targets);
  const fromRef = useRef<number[]>(targets);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const targetRef = useRef<number[]>(targets);

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
      const to = targetRef.current;
      const next = from.map((f, i) => f + (to[i] - f) * eased);
      setCurrent(next);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else fromRef.current = to;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [targets.join(","), enabled]);

  return current;
}

// ── SVG constants ─────────────────────────────────────────────────────────────
const SVG_W = 700;
const SVG_H = 200;
const CENTER_Y = 100;
const MAX_HALF = 85;
const MIN_HALF = 20;

// Color progression: bright crimson → deep maroon (from SVG reference)
const STAGE_COLORS = [
  "#F7304E",
  "#D72343",
  "#B21D38",
  "#90192F",
  "#711526",
  "#51111E",
];

// ── Props ─────────────────────────────────────────────────────────────────────
export interface FunilStage {
  label: string;
  shortLabel?: string;
  val: number;
  pctDeTopo: number;
}

interface FunilSVGCoreProps {
  stages: FunilStage[];
  loading?: boolean;
  /** Suppress animation (e.g. prefers-reduced-motion) */
  reduceMotion?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function FunilSVGCore({ stages, loading = false, reduceMotion = false }: FunilSVGCoreProps) {
  const n = stages.length;
  const vals = stages.map((s) => s.val);
  const vMax = vals[0] > 0 ? vals[0] : Math.max(...vals, 1);

  // n+1 boundary half-heights: boundary[i] = halfH for the left edge of stage i
  // boundary[n] = boundary[n-1] so the last stage is a rectangle when val=0
  const targetBounds = React.useMemo(() => {
    const b: number[] = [];
    for (let i = 0; i < n; i++) {
      b.push(funnelHalfH(vals[i], vMax, MAX_HALF, MIN_HALF));
    }
    // Last cap: if last val is 0, hold the previous boundary (rectangle)
    b.push(funnelHalfH(vals[n - 1], vMax, MAX_HALF, MIN_HALF));
    return b;
  }, [vals.join(","), vMax]);

  const boundaries = useAnimatedBoundaries(targetBounds, 600, !loading && !reduceMotion);

  const stageW = SVG_W / n;

  // Detect non-monotonic stages (val[i+1] > val[i])
  const nonMonotonic: boolean[] = vals.map((v, i) => i > 0 && v > vals[i - 1]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Non-monotonic warning */}
      {nonMonotonic.some(Boolean) && (
        <div
          style={{
            fontSize: 10,
            color: "#fbbf24",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ opacity: 0.7 }}>⚠</span>
          <span style={{ opacity: 0.7 }}>
            Escala visual — algumas etapas apresentam valores maiores que a anterior (dado não-monotônico).
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Subtle highlight gradients per stage */}
          {STAGE_COLORS.map((color, i) => (
            <linearGradient key={i} id={`fg-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
            </linearGradient>
          ))}
        </defs>

        {stages.map((stage, i) => {
          const xL = i * stageW;
          const xR = (i + 1) * stageW;
          const hL = boundaries[i]   ?? MIN_HALF;
          const hR = boundaries[i + 1] ?? MIN_HALF;

          const points = [
            [xL, CENTER_Y - hL],
            [xR, CENTER_Y - hR],
            [xR, CENTER_Y + hR],
            [xL, CENTER_Y + hL],
          ]
            .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
            .join(" ");

          const cx = xL + stageW / 2;
          const stageH = hL + hR; // approximate height for text visibility
          const showVal = stageH > 36; // hide text if stage is too thin
          const isNM = nonMonotonic[i];

          return (
            <g key={i}>
              {/* Base fill */}
              <polygon
                points={points}
                fill={STAGE_COLORS[i] ?? STAGE_COLORS[STAGE_COLORS.length - 1]}
                stroke="#1A1C22"
                strokeWidth="1"
              />
              {/* Highlight overlay */}
              <polygon
                points={points}
                fill={`url(#fg-${i})`}
                stroke="none"
              />
              {/* Non-monotonic indicator: dashed border */}
              {isNM && (
                <polygon
                  points={points}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
              )}
              {/* Value label */}
              {!loading && showVal && (
                <text
                  x={cx}
                  y={CENTER_Y - 5}
                  textAnchor="middle"
                  fontSize="17"
                  fontWeight="700"
                  fill="white"
                  style={{ fontFamily: "inherit" }}
                >
                  {stage.val}
                </text>
              )}
              {/* Stage label */}
              {!loading && showVal && (
                <text
                  x={cx}
                  y={CENTER_Y + 13}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#F4CDD3"
                  style={{ fontFamily: "inherit" }}
                >
                  {stage.shortLabel ?? stage.label}
                </text>
              )}
              {/* % from top */}
              {!loading && showVal && (
                <text
                  x={cx}
                  y={CENTER_Y + 25}
                  textAnchor="middle"
                  fontSize="7"
                  fill="rgba(255,255,255,0.45)"
                  style={{ fontFamily: "inherit" }}
                >
                  {i === 0 ? "100%" : `${stage.pctDeTopo.toFixed(1)}%`}
                </text>
              )}
            </g>
          );
        })}

        {/* Scale label */}
        <text
          x={SVG_W - 4}
          y={SVG_H - 4}
          textAnchor="end"
          fontSize="6.5"
          fill="rgba(255,255,255,0.2)"
          style={{ fontFamily: "inherit" }}
        >
          ESCALA VISUAL √
        </text>
      </svg>
    </div>
  );
}
