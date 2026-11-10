export type CanalOrigem = "meta" | "instagram" | "whatsapp" | "email" | "outros" | "naoIdentificada";

export type DistribuicaoOrigem = Record<CanalOrigem, number> & { total: number };

const normalizar = (valor: string | null | undefined) =>
  (valor ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Valores que o CRM usa quando nao ha canal conhecido; "paid_social" apos "|" e apenas o medium.
const SEM_CANAL = new Set([
  "", "desconhecido", "desconhecida", "unknown", "n/a", "na", "null", "undefined",
  "nao informado", "sem origem", "outros", "outro", "none", "(none)",
  "paid_social", "paid social",
]);

export function classificarOrigem(valor: string | null | undefined): CanalOrigem {
  const s = normalizar(valor);
  if (SEM_CANAL.has(s.split("|")[0].trim())) return "naoIdentificada";
  // "Meta (Facebook/Instagram)" e "Meta Ads (WhatsApp)" citam outros canais no texto: Meta vem primeiro.
  if (/(^|[^a-z])meta([^a-z]|$)/.test(s) || s.includes("facebook")) return "meta";
  if (s.includes("instagram")) return "instagram";
  if (s.includes("whatsapp") || s.includes("wpp") || s.includes("wa.me")) return "whatsapp";
  if (s.includes("e-mail") || s.includes("email")) return "email";
  return "outros";
}

// Base = negocios reais do CRM; negocio sem registro de origem conta como nao identificado.
export function distribuirOrigens(
  dealIds: ReadonlyArray<string>,
  origemPorDeal: ReadonlyMap<string, string | null>,
): DistribuicaoOrigem {
  const resultado: DistribuicaoOrigem = {
    meta: 0, instagram: 0, whatsapp: 0, email: 0, outros: 0, naoIdentificada: 0, total: 0,
  };
  const vistos = new Set<string>();
  for (const id of dealIds) {
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    resultado[classificarOrigem(origemPorDeal.get(id))] += 1;
    resultado.total += 1;
  }
  return resultado;
}
