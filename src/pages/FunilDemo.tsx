import { useState } from "react";
import { FunilSVGCore } from "@/components/FunilSVGCore";

// ── Test scenarios ────────────────────────────────────────────────────────────
const SCENARIOS: Record<string, { label: string; vals: number[] }> = {
  A: {
    label: "A — Conversão atual",
    vals: [67, 21, 18, 17, 7, 0],
  },
  B: {
    label: "B — Alta conversão",
    vals: [67, 55, 47, 38, 25, 15],
  },
  C: {
    label: "C — Baixa conversão",
    vals: [67, 12, 6, 3, 1, 0],
  },
  D: {
    label: "D — Todos zero",
    vals: [0, 0, 0, 0, 0, 0],
  },
  E: {
    label: "E — Não monotônico (MQL > Leads)",
    vals: [20, 35, 18, 17, 7, 0],
  },
};

const LABELS = [
  { label: "Leads recebidos", shortLabel: "Leads" },
  { label: "MQL qualificados", shortLabel: "MQL" },
  { label: "Reuniões agendadas", shortLabel: "Agend." },
  { label: "Reuniões realizadas", shortLabel: "Reuniões" },
  { label: "Propostas enviadas", shortLabel: "Propostas" },
  { label: "Fechados", shortLabel: "Vendas" },
];

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

export default function FunilDemo() {
  const [active, setActive] = useState<string>("A");

  const scenario = SCENARIOS[active];
  const vals = scenario.vals;
  const vMax = vals[0] > 0 ? vals[0] : Math.max(...vals, 1);

  const stages = vals.map((v, i) => ({
    label: LABELS[i].label,
    shortLabel: LABELS[i].shortLabel,
    val: v,
    pctDeTopo: i === 0 ? 100 : pct(v, vMax),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-6 px-4">
      {/* Header */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
        <strong>Página de demonstração</strong> — dados fictícios para validação visual do funil SVG dinâmico.
        Não conectada ao Supabase. Não publicar em produção antes de aprovação.
      </div>

      <div>
        <h1 className="font-display font-bold text-2xl">Funil SVG — Demo</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Geometria derivada dos valores. Escala visual √ com altura mínima para v=0.
        </p>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SCENARIOS).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
            style={
              active === key
                ? { background: "#F7304E", borderColor: "#F7304E", color: "white" }
                : {
                    background: "hsl(var(--card)/0.4)",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--muted-foreground))",
                  }
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Funnel */}
      <div
        className="rounded-2xl border border-border/60 p-5"
        style={{ background: "hsl(var(--card)/0.5)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
          {scenario.label} — valores: [{vals.join(", ")}]
        </p>
        <FunilSVGCore stages={stages} />
      </div>

      {/* Data table */}
      <div
        className="rounded-xl border border-border/40 overflow-hidden"
        style={{ background: "hsl(var(--card)/0.3)" }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left px-4 py-2 text-muted-foreground font-semibold">Etapa</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-semibold">Valor</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-semibold">% do Topo</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s, i) => {
              const isNM = i > 0 && vals[i] > vals[i - 1];
              return (
                <tr key={i} className="border-b border-border/20 last:border-0">
                  <td className="px-4 py-2 text-foreground">
                    {s.label}
                    {isNM && <span className="ml-2 text-amber-400">⚠ não-monotônico</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-foreground">{s.val}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">
                    {i === 0 ? "100%" : `${s.pctDeTopo.toFixed(1)}%`}
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
