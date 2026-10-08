import { useState } from "react";
import { FunilSVGCore } from "@/components/FunilSVGCore";

// ── Test scenarios ─────────────────────────────────────────────────────────────
const SCENARIOS: { key: string; label: string; desc: string; vals: number[] }[] = [
  {
    key: "A",
    label: "A — Conversão atual",
    desc: "Pipeline real do período",
    vals: [67, 21, 18, 17, 7, 0],
  },
  {
    key: "B",
    label: "B — Alta conversão",
    desc: "Cenário de alto desempenho",
    vals: [67, 55, 47, 38, 25, 15],
  },
  {
    key: "C",
    label: "C — Baixa conversão",
    desc: "Referência do SVG original",
    vals: [67, 12, 6, 3, 1, 0],
  },
  {
    key: "D",
    label: "D — Todos zero",
    desc: "Sem dados no período",
    vals: [0, 0, 0, 0, 0, 0],
  },
  {
    key: "E",
    label: "E — Não monotônico",
    desc: "MQL > Leads (dado inconsistente)",
    vals: [20, 35, 18, 17, 7, 0],
  },
];

const STAGE_LABELS = [
  { label: "Leads recebidos",     shortLabel: "Leads"    },
  { label: "MQL qualificados",    shortLabel: "MQL"      },
  { label: "Reuniões agendadas",  shortLabel: "Agend."   },
  { label: "Reuniões realizadas", shortLabel: "Reuniões" },
  { label: "Propostas enviadas",  shortLabel: "Propostas"},
  { label: "Fechados",            shortLabel: "Vendas"   },
];

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

const METAS = [
  { label: "qualificados",       meta: 35 },
  { label: "agendaram",          meta: 70 },
  { label: "compareceram",       meta: 70 },
  { label: "receberam proposta", meta: 70 },
  { label: "fecharam",           meta: 30 },
];

function statusColor(real: number, meta: number) {
  if (real > 100) return { text: "#9ca3af", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)" };
  if (real >= meta)         return { text: "#4ade80", bg: "rgba(22,163,74,0.12)",  border: "rgba(22,163,74,0.3)"  };
  if (real >= meta * 0.7)   return { text: "#fbbf24", bg: "rgba(217,119,6,0.12)",  border: "rgba(217,119,6,0.3)"  };
  return                           { text: "#f87171", bg: "rgba(220,38,38,0.12)",  border: "rgba(220,38,38,0.3)"  };
}

export default function FunilDemo() {
  const [active, setActive] = useState("A");
  const sc = SCENARIOS.find((s) => s.key === active) ?? SCENARIOS[0];
  const vals = sc.vals;
  const vMax = vals[0] > 0 ? vals[0] : Math.max(...vals, 1);

  const stages = vals.map((v, i) => ({
    label:      STAGE_LABELS[i].label,
    shortLabel: STAGE_LABELS[i].shortLabel,
    val:        v,
    pctDeTopo:  i === 0 ? 100 : pct(v, vMax),
  }));

  const conversoes = vals.slice(1).map((v, i) => ({
    real: pct(v, vals[i]),
    meta: METAS[i].meta,
    label: METAS[i].label,
  }));

  return (
    <div
      style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "24px 20px",
        fontFamily: "inherit",
        color: "#F7F8FA",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(251,191,36,0.25)",
          background: "rgba(251,191,36,0.06)",
          padding: "10px 16px",
          fontSize: 11,
          color: "#fbbf24",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>⚠</span>
        <span>
          <strong>Página de demonstração</strong> — dados fictícios para validação visual.
          Sem conexão com Supabase. Não publicar em produção sem autorização explícita.
        </span>
      </div>

      <h1
        style={{
          fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em",
          marginBottom: 4,
        }}
      >
        Funil SVG — Demonstração
      </h1>
      <p style={{ fontSize: 12, color: "#9BA5B4", marginBottom: 24 }}>
        Geometria derivada dos valores via escala √. Cada cenário produz uma silhueta diferente.
      </p>

      {/* Scenario selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
        {SCENARIOS.map((s) => {
          const active_ = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "7px 14px",
                borderRadius: 99,
                border: `1px solid ${active_ ? "#F7304E" : "rgba(38,48,60,1)"}`,
                background: active_ ? "#F7304E" : "rgba(23,30,40,0.8)",
                color: active_ ? "white" : "#9BA5B4",
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.01em",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Funnel card */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid #26303C",
          background: "rgba(17,23,32,0.85)",
          padding: "24px 20px 20px",
          marginBottom: 20,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 16,
            flexWrap: "wrap", gap: 6,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#9BA5B4", textTransform: "uppercase" }}>
              {sc.label}
            </div>
            <div style={{ fontSize: 11, color: "#9BA5B4", marginTop: 2 }}>{sc.desc}</div>
          </div>
          <div
            style={{
              fontSize: 10, color: "#9BA5B4",
              fontFamily: "monospace",
              background: "rgba(38,48,60,0.5)",
              padding: "3px 8px", borderRadius: 6,
              border: "1px solid #26303C",
            }}
          >
            [{vals.join(", ")}]
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 480 }}>
            <FunilSVGCore stages={stages} showLabelStrip />
          </div>
        </div>
      </div>

      {/* Conversion rates */}
      <div
        style={{
          borderRadius: 16,
          border: "1px solid #26303C",
          background: "rgba(17,23,32,0.7)",
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 10, fontWeight: 700,
            letterSpacing: "0.08em", color: "#9BA5B4",
            textTransform: "uppercase", marginBottom: 12,
          }}
        >
          Taxas de conversão entre etapas
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {conversoes.map((c, i) => {
            const sc2 = statusColor(c.real, c.meta);
            const hasData = vals[i] > 0;
            return (
              <div
                key={i}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${sc2.border}`,
                  background: sc2.bg,
                  padding: "8px 12px",
                  minWidth: 90,
                  flex: "1 1 80px",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: sc2.text }}>
                  {hasData ? `${c.real.toFixed(1)}%` : "N/D"}
                </div>
                <div style={{ fontSize: 9, color: sc2.text, opacity: 0.7, marginTop: 3, lineHeight: 1.3 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  meta {c.meta}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data table */}
      <div
        style={{
          borderRadius: 12,
          border: "1px solid #26303C",
          overflow: "hidden",
          background: "rgba(17,23,32,0.6)",
        }}
      >
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #26303C" }}>
              {["Etapa", "Valor", "% do Topo", "Observação"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 14px",
                    textAlign: h === "Valor" || h === "% do Topo" ? "right" : "left",
                    fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#9BA5B4",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => {
              const isNM = i > 0 && vals[i] > vals[i - 1];
              return (
                <tr key={i} style={{ borderBottom: i < stages.length - 1 ? "1px solid rgba(38,48,60,0.6)" : "none" }}>
                  <td style={{ padding: "8px 14px", color: "#F7F8FA" }}>{s.label}</td>
                  <td style={{ padding: "8px 14px", textAlign: "right", fontWeight: 700, color: "#F7F8FA" }}>
                    {s.val}
                  </td>
                  <td style={{ padding: "8px 14px", textAlign: "right", color: "#9BA5B4" }}>
                    {i === 0 ? "100%" : vMax > 0 ? `${s.pctDeTopo.toFixed(1)}%` : "N/D"}
                  </td>
                  <td style={{ padding: "8px 14px", fontSize: 10 }}>
                    {isNM && (
                      <span
                        style={{
                          color: "#fbbf24",
                          background: "rgba(251,191,36,0.12)",
                          border: "1px solid rgba(251,191,36,0.3)",
                          borderRadius: 4,
                          padding: "2px 6px",
                        }}
                      >
                        ↑ não-monotônico
                      </span>
                    )}
                    {s.val === 0 && i > 0 && !isNM && (
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>altura mínima (legibilidade)</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
