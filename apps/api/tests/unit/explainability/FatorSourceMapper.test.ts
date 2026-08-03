import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { Fator } from "../../../src/modules/classification/domain/value-objects/Fator.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { FatorSourceMapper } from "../../../src/modules/explainability/domain/services/FatorSourceMapper.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

function buildEvidencias() {
  const dossie = Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW });
  dossie.atualizarEvidencia(
    "PGFN",
    Evidence.encontrada({
      valor: { temPendencia: true },
      fonte: "PGFN",
      dataConsulta: NOW,
      confidenceScore: CONF,
    }),
    NOW,
  );
  dossie.atualizarEvidencia(
    "DATAJUD",
    Evidence.encontrada({
      valor: { temProcesso: false },
      fonte: "DATAJUD",
      dataConsulta: NOW,
      confidenceScore: CONF,
    }),
    NOW,
  );
  dossie.atualizarEvidencia(
    "RECEITA_FEDERAL",
    Evidence.encontrada({
      valor: { situacaoCadastral: "ATIVA" },
      fonte: "RECEITA_FEDERAL",
      dataConsulta: NOW,
      confidenceScore: CONF,
    }),
    NOW,
  );
  return dossie.evidencias;
}

describe("FatorSourceMapper", () => {
  it("liga o fator de Pendência Fiscal (PGFN) à evidência real de PGFN", () => {
    const fator = Fator.create({
      nome: "Pendência Fiscal (PGFN)",
      peso: 0.4,
      fonte: "PGFN",
      direcao: "AUMENTA_RISCO",
      justificativa: "PGFN reporta pendência fiscal em aberto",
    });

    const [explicado] = FatorSourceMapper.map([fator], buildEvidencias());

    expect(explicado?.fonte).toBe("PGFN");
    expect(explicado?.impacto).toBe(0.4);
    expect(explicado?.evidencia.status).toBe("ENCONTRADO");
    expect(explicado?.evidencia.status === "ENCONTRADO" && explicado.evidencia.valor).toEqual({
      temPendencia: true,
    });
  });

  it("liga o fator de Processo Judicial (DataJud) à evidência real de DataJud, com impacto negativo quando REDUZ_RISCO", () => {
    const fator = Fator.create({
      nome: "Processo Judicial (DataJud)",
      peso: 0.35,
      fonte: "DATAJUD",
      direcao: "REDUZ_RISCO",
      justificativa: "DataJud não reporta nenhum processo judicial ativo",
    });

    const [explicado] = FatorSourceMapper.map([fator], buildEvidencias());

    expect(explicado?.fonte).toBe("DATAJUD");
    expect(explicado?.impacto).toBe(-0.35);
  });

  it("liga o fator de Situação Cadastral (Receita Federal) à evidência real de Receita Federal", () => {
    const fator = Fator.create({
      nome: "Situação Cadastral (Receita Federal)",
      peso: 0.25,
      fonte: "RECEITA_FEDERAL",
      direcao: "REDUZ_RISCO",
      justificativa: "Situação cadastral na Receita Federal é ATIVA",
    });

    const [explicado] = FatorSourceMapper.map([fator], buildEvidencias());

    expect(explicado?.fonte).toBe("RECEITA_FEDERAL");
  });

  it("mapeia múltiplos fatores preservando a ordem de entrada", () => {
    const fatorPgfn = Fator.create({
      nome: "Pendência Fiscal (PGFN)",
      peso: 0.4,
      fonte: "PGFN",
      direcao: "AUMENTA_RISCO",
      justificativa: "x",
    });
    const fatorReceita = Fator.create({
      nome: "Situação Cadastral (Receita Federal)",
      peso: 0.25,
      fonte: "RECEITA_FEDERAL",
      direcao: "REDUZ_RISCO",
      justificativa: "y",
    });

    const explicados = FatorSourceMapper.map([fatorPgfn, fatorReceita], buildEvidencias());

    expect(explicados.map((e) => e.fonte)).toEqual(["PGFN", "RECEITA_FEDERAL"]);
  });
});
