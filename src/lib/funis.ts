// Fonte única de verdade para os funis do CS Dash.
// Qualquer novo funil deve ser adicionado aqui (pipeline_id, cor e posição na ordem canônica)
// e depois cadastrado na tela de Configurações > Funil para aparecer nos filtros.

export const PIPELINE_IDS: Record<string, string> = {
  "Segredos da Confecção": "699effbf7b4346001f83c691",
  "UniForce": "6a04bd740b69f50013dd4c1a",
  "Imersão Paraguai": "699f00342be5b20013e23f9c",
  "CS Club": "6848412da06be900147fd766",
  "Imersão Europa": "6a3ab5572a7c51002575739f",
  "Imersão China": "6a3ab56ba02ee90021dd1c3b",
  "Supplytex": "699f332c5c43de0019d4f9ef",
};

export const FUNIL_CORES: Record<string, string> = {
  "Segredos da Confecção": "#E8192C",
  "UniForce": "#C9A017",
  "Imersão Paraguai": "#4A9EFF",
  "CS Club": "#7C3AED",
  "Imersão Europa": "#10B981",
  "Imersão China": "#F97316",
  "Supplytex": "#EC4899",
};

// Ordem "padrão" de exibição quando não há preferência explícita do usuário.
export const FUNIS_ORDEM_CANONICA = [
  "Segredos da Confecção",
  "UniForce",
  "Imersão Paraguai",
  "CS Club",
  "Imersão Europa",
  "Imersão China",
  "Supplytex",
];
