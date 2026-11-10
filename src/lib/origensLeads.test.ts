import { describe, expect, it } from "vitest";
import { classificarOrigem, distribuirOrigens } from "./origensLeads";

const mapa = (linhas: Array<[string, string | null]>) => new Map(linhas);

describe("classificarOrigem", () => {
  it.each([
    ["Meta Ads", "meta"],
    ["Facebook", "meta"],
    ["Meta (Facebook/Instagram)", "meta"],
    ["Meta Ads (WhatsApp)", "meta"],
    ["Instagram", "instagram"],
    ["WhatsApp", "whatsapp"],
    ["E-mail", "email"],
    ["Google Ads", "outros"],
    ["TikTok", "outros"],
    ["Desconhecido", "naoIdentificada"],
    ["Outros | paid_social", "naoIdentificada"],
    ["paid_social", "naoIdentificada"],
    ["", "naoIdentificada"],
    [null, "naoIdentificada"],
  ] as const)("%s -> %s", (origem, canal) => {
    expect(classificarOrigem(origem)).toBe(canal);
  });
});

describe("distribuirOrigens", () => {
  it("5 negocios no CRM, 4 na view, nenhuma origem identificavel", () => {
    const d = distribuirOrigens(
      ["a", "b", "c", "d", "e"],
      mapa([["a", "Desconhecido"], ["b", "Outros | paid_social"], ["c", "Desconhecido"], ["d", "Outros | paid_social"]]),
    );
    expect(d).toMatchObject({ total: 5, meta: 0, instagram: 0, whatsapp: 0, email: 0, outros: 0, naoIdentificada: 5 });
  });

  it("separa canais, outros canais identificados e nao identificados, e a soma fecha com o total", () => {
    const d = distribuirOrigens(
      ["1", "2", "3", "4", "5", "6"],
      mapa([["1", "Meta Ads"], ["2", "Instagram"], ["3", "WhatsApp"], ["4", "Google Ads"], ["5", null]]),
    );
    expect(d).toMatchObject({ meta: 1, instagram: 1, whatsapp: 1, email: 0, outros: 1, naoIdentificada: 2, total: 6 });
    expect(d.meta + d.instagram + d.whatsapp + d.email + d.outros + d.naoIdentificada).toBe(d.total);
  });

  it("nao duplica negocios repetidos nem conta ids vazios", () => {
    const d = distribuirOrigens(["a", "a", "", "b"], mapa([["a", "Facebook"]]));
    expect(d).toMatchObject({ total: 2, meta: 1, naoIdentificada: 1 });
  });

  it("sem negocios, total zero", () => {
    expect(distribuirOrigens([], mapa([]))).toMatchObject({ total: 0, naoIdentificada: 0 });
  });
});
