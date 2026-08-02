import type { RecommendationRuleInput } from "../../../src/modules/recommendation/application/ports/IRecommendationRule.js";
import { RecomendarCobrancaAmigavelRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarWhatsappRule.js";

function buildInput(overrides: Partial<RecommendationRuleInput> = {}): RecommendationRuleInput {
  return { classe: "BAIXO_RISCO", score: 0, confianca: 1, nivelConfianca: "ALTA", ...overrides };
}

describe("RecomendarWhatsappRule", () => {
  const rule = new RecomendarWhatsappRule();

  it("se aplica a BAIXO_RISCO", () => {
    expect(rule.avaliar(buildInput({ classe: "BAIXO_RISCO" }))?.canal).toBe("WHATSAPP");
  });

  it("não se aplica a outras classes", () => {
    expect(rule.avaliar(buildInput({ classe: "MEDIO_RISCO" }))).toBeNull();
    expect(rule.avaliar(buildInput({ classe: "ALTO_RISCO" }))).toBeNull();
  });
});

describe("RecomendarCobrancaAmigavelRule", () => {
  const rule = new RecomendarCobrancaAmigavelRule();

  it("se aplica a BAIXO_RISCO", () => {
    expect(rule.avaliar(buildInput({ classe: "BAIXO_RISCO" }))?.canal).toBe("COBRANCA_AMIGAVEL");
  });
});

describe("RecomendarLigacaoRule", () => {
  const rule = new RecomendarLigacaoRule();

  it("se aplica só a MEDIO_RISCO", () => {
    expect(rule.avaliar(buildInput({ classe: "MEDIO_RISCO" }))?.canal).toBe("LIGACAO");
    expect(rule.avaliar(buildInput({ classe: "BAIXO_RISCO" }))).toBeNull();
    expect(rule.avaliar(buildInput({ classe: "ALTO_RISCO" }))).toBeNull();
  });
});

describe("RecomendarParcelamentoRule", () => {
  const rule = new RecomendarParcelamentoRule();

  it("se aplica a MEDIO_RISCO independente da confiança", () => {
    expect(
      rule.avaliar(buildInput({ classe: "MEDIO_RISCO", nivelConfianca: "BAIXA" }))?.canal,
    ).toBe("PARCELAMENTO");
  });

  it("se aplica a ALTO_RISCO só quando a confiança não é baixa", () => {
    expect(rule.avaliar(buildInput({ classe: "ALTO_RISCO", nivelConfianca: "MEDIA" }))?.canal).toBe(
      "PARCELAMENTO",
    );
    expect(rule.avaliar(buildInput({ classe: "ALTO_RISCO", nivelConfianca: "BAIXA" }))).toBeNull();
  });

  it("não se aplica a BAIXO_RISCO", () => {
    expect(rule.avaliar(buildInput({ classe: "BAIXO_RISCO" }))).toBeNull();
  });
});

describe("RecomendarCobrancaJuridicaRule", () => {
  const rule = new RecomendarCobrancaJuridicaRule();

  it("se aplica a ALTO_RISCO com confiança não baixa", () => {
    expect(rule.avaliar(buildInput({ classe: "ALTO_RISCO", nivelConfianca: "ALTA" }))?.canal).toBe(
      "COBRANCA_JURIDICA",
    );
  });

  it("não se aplica a ALTO_RISCO com confiança baixa", () => {
    expect(rule.avaliar(buildInput({ classe: "ALTO_RISCO", nivelConfianca: "BAIXA" }))).toBeNull();
  });

  it("não se aplica a classes diferentes de ALTO_RISCO", () => {
    expect(rule.avaliar(buildInput({ classe: "MEDIO_RISCO", nivelConfianca: "ALTA" }))).toBeNull();
  });
});
