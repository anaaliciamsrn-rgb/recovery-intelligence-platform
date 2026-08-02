import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import type { ClassificationRuleInput } from "../../../src/modules/classification/application/ports/IClassificationRule.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../../../src/modules/classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../../../src/modules/classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

function buildInput(overrides: Partial<ClassificationRuleInput> = {}): ClassificationRuleInput {
  return {
    pgfn: Evidence.naoConsultada({ fonte: "PGFN" }),
    dataJud: Evidence.naoConsultada({ fonte: "DATAJUD" }),
    receitaFederal: Evidence.naoConsultada({ fonte: "RECEITA_FEDERAL" }),
    portalTransparencia: Evidence.naoConsultada({ fonte: "PORTAL_TRANSPARENCIA" }),
    cenprot: Evidence.naoConsultada({ fonte: "CENPROT" }),
    ...overrides,
  };
}

describe("PendenciaFiscalPgfnRule", () => {
  const rule = new PendenciaFiscalPgfnRule();

  it("não se aplica quando PGFN ainda não foi consultado", () => {
    expect(rule.avaliar(buildInput())).toBeNull();
  });

  it("aumenta risco quando há pendência", () => {
    const input = buildInput({
      pgfn: Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    });

    expect(rule.avaliar(input)?.direcao).toBe("AUMENTA_RISCO");
  });

  it("reduz risco quando não há pendência", () => {
    const input = buildInput({
      pgfn: Evidence.encontrada({
        valor: { temPendencia: false },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    });

    expect(rule.avaliar(input)?.direcao).toBe("REDUZ_RISCO");
  });

  it("não se aplica quando o valor não tem o formato esperado", () => {
    const input = buildInput({
      pgfn: Evidence.encontrada({
        valor: "formato inesperado",
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    });

    expect(rule.avaliar(input)).toBeNull();
  });
});

describe("ProcessoJudicialDataJudRule", () => {
  const rule = new ProcessoJudicialDataJudRule();

  it("aumenta risco quando há processo", () => {
    const input = buildInput({
      dataJud: Evidence.encontrada({
        valor: { temProcesso: true },
        fonte: "DATAJUD",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    });

    expect(rule.avaliar(input)?.direcao).toBe("AUMENTA_RISCO");
  });

  it("não se aplica quando não consultado", () => {
    expect(rule.avaliar(buildInput())).toBeNull();
  });
});

describe("SituacaoCadastralReceitaRule", () => {
  const rule = new SituacaoCadastralReceitaRule();

  it("reduz risco quando situação é ATIVA", () => {
    const input = buildInput({
      receitaFederal: Evidence.encontrada({
        valor: { situacaoCadastral: "ATIVA" },
        fonte: "RECEITA_FEDERAL",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    });

    expect(rule.avaliar(input)?.direcao).toBe("REDUZ_RISCO");
  });

  it("aumenta risco quando situação não é ATIVA", () => {
    const input = buildInput({
      receitaFederal: Evidence.encontrada({
        valor: { situacaoCadastral: "SUSPENSA" },
        fonte: "RECEITA_FEDERAL",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    });

    expect(rule.avaliar(input)?.direcao).toBe("AUMENTA_RISCO");
  });
});
