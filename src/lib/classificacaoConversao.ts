// CS DASH: classificação comercial compartilhada.
// 85% da meta = início da faixa de atenção.
// Taxas acima de 100% ficam cinzas por possível
// diferença de bases temporais entre etapas.

export type StatusConversao =
  "good" | "near" | "bad" | "invalid";

export function classificarConversao(
  real: number,
  meta: number
): StatusConversao {
  if (
    !Number.isFinite(real) ||
    !Number.isFinite(meta) ||
    meta <= 0 ||
    real < 0 ||
    real > 100
  ) return "invalid";

  if (real >= meta) return "good";
  if (real >= meta * 0.85) return "near";
  return "bad";
}
