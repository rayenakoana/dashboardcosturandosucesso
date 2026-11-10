// Copia da classificacao regional aprovada.
// Origem: MapaGeografico.tsx.
// Nao modificar independentemente da origem.

const REGIOES_BR = [
  "Sudeste",
  "Sul",
  "Nordeste",
  "Centro-Oeste",
  "Norte",
] as const;

const REGIAO_UF: Record<string, string> = {
  SP: "Sudeste", RJ: "Sudeste",
  MG: "Sudeste", ES: "Sudeste",
  PR: "Sul", SC: "Sul", RS: "Sul",
  BA: "Nordeste", SE: "Nordeste",
  AL: "Nordeste", PE: "Nordeste",
  PB: "Nordeste", RN: "Nordeste",
  CE: "Nordeste", PI: "Nordeste",
  MA: "Nordeste",
  GO: "Centro-Oeste", MT: "Centro-Oeste",
  MS: "Centro-Oeste", DF: "Centro-Oeste",
  AM: "Norte", PA: "Norte",
  AC: "Norte", AP: "Norte",
  RO: "Norte", RR: "Norte",
  TO: "Norte",
};

const REGIAO_ESTADO: Record<string, string> = {
  "sao paulo": "Sudeste",
  "rio de janeiro": "Sudeste",
  "minas gerais": "Sudeste",
  "espirito santo": "Sudeste",
  "parana": "Sul",
  "santa catarina": "Sul",
  "rio grande do sul": "Sul",
  "bahia": "Nordeste",
  "sergipe": "Nordeste",
  "alagoas": "Nordeste",
  "pernambuco": "Nordeste",
  "paraiba": "Nordeste",
  "rio grande do norte": "Nordeste",
  "ceara": "Nordeste",
  "piaui": "Nordeste",
  "maranhao": "Nordeste",
  "goias": "Centro-Oeste",
  "mato grosso": "Centro-Oeste",
  "mato grosso do sul": "Centro-Oeste",
  "distrito federal": "Centro-Oeste",
  "amazonas": "Norte",
  "para": "Norte",
  "acre": "Norte",
  "amapa": "Norte",
  "rondonia": "Norte",
  "roraima": "Norte",
  "tocantins": "Norte",
};

function textoGeoNormalizado(valor: string | null) {
  return (valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function obterRegiaoGeo(
  uf: string | null,
  estado: string | null,
  regiao: string | null
) {
  const sigla = (uf || "").trim().toUpperCase();
  if (REGIAO_UF[sigla]) return REGIAO_UF[sigla];

  const estadoNormalizado = textoGeoNormalizado(estado);
  if (REGIAO_UF[estadoNormalizado.toUpperCase()]) {
    return REGIAO_UF[estadoNormalizado.toUpperCase()];
  }
  if (REGIAO_ESTADO[estadoNormalizado]) {
    return REGIAO_ESTADO[estadoNormalizado];
  }

  const regiaoNormalizada = textoGeoNormalizado(regiao)
    .replace(/^regiao\s+/, "");

  const encontrados = REGIOES_BR.find(
    r => textoGeoNormalizado(r) === regiaoNormalizada
  );

  return encontrados || "Não identificada";
}


export { obterRegiaoGeo };
