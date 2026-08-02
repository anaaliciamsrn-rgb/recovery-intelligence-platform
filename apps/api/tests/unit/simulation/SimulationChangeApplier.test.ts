import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import {
  InvalidSimulationChangeError,
  SimulationChangeApplier,
} from "../../../src/modules/simulation/domain/services/SimulationChangeApplier.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

function buildEvidencias() {
  return Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW })
    .evidencias;
}

describe("SimulationChangeApplier.applyEvidenceChanges", () => {
  it("substitui uma fonte por uma evidência ENCONTRADO", () => {
    const resultado = SimulationChangeApplier.applyEvidenceChanges(
      buildEvidencias(),
      [
        {
          tipo: "EVIDENCIA",
          fonte: "PGFN",
          acao: "SUBSTITUIR",
          status: "ENCONTRADO",
          valor: { temPendencia: true },
          confidenceScore: 0.8,
        },
      ],
      NOW,
    );

    expect(resultado.pgfn.status).toBe("ENCONTRADO");
    expect(resultado.pgfn.status === "ENCONTRADO" && resultado.pgfn.valor).toEqual({
      temPendencia: true,
    });
  });

  it("substitui uma fonte por NAO_ENCONTRADO", () => {
    const resultado = SimulationChangeApplier.applyEvidenceChanges(
      buildEvidencias(),
      [{ tipo: "EVIDENCIA", fonte: "DATAJUD", acao: "SUBSTITUIR", status: "NAO_ENCONTRADO" }],
      NOW,
    );

    expect(resultado.dataJud.status).toBe("NAO_ENCONTRADO");
  });

  it("substitui uma fonte por ERRO_CONSULTA", () => {
    const resultado = SimulationChangeApplier.applyEvidenceChanges(
      buildEvidencias(),
      [
        {
          tipo: "EVIDENCIA",
          fonte: "CENPROT",
          acao: "SUBSTITUIR",
          status: "ERRO_CONSULTA",
          motivoErro: "timeout simulado",
        },
      ],
      NOW,
    );

    expect(resultado.cenprot.status).toBe("ERRO_CONSULTA");
    expect(resultado.cenprot.status === "ERRO_CONSULTA" && resultado.cenprot.motivoErro).toBe(
      "timeout simulado",
    );
  });

  it("remove uma fonte já consultada, voltando para NAO_CONSULTADO", () => {
    const evidenciasComPgfn = {
      ...buildEvidencias(),
      pgfn: Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
    };

    const resultado = SimulationChangeApplier.applyEvidenceChanges(
      evidenciasComPgfn,
      [{ tipo: "EVIDENCIA", fonte: "PGFN", acao: "REMOVER" }],
      NOW,
    );

    expect(resultado.pgfn.status).toBe("NAO_CONSULTADO");
  });

  it("ignora mudanças que não são do tipo EVIDENCIA", () => {
    const resultado = SimulationChangeApplier.applyEvidenceChanges(
      buildEvidencias(),
      [{ tipo: "CONFIANCA_OVERRIDE", valor: 0.9 }],
      NOW,
    );

    expect(resultado.pgfn.status).toBe("NAO_CONSULTADO");
  });

  it("lança InvalidSimulationChangeError quando SUBSTITUIR não informa status", () => {
    expect(() =>
      SimulationChangeApplier.applyEvidenceChanges(
        buildEvidencias(),
        [{ tipo: "EVIDENCIA", fonte: "PGFN", acao: "SUBSTITUIR" }],
        NOW,
      ),
    ).toThrow(InvalidSimulationChangeError);
  });
});

describe("SimulationChangeApplier.applyOverrides", () => {
  it("devolve os valores originais quando não há overrides", () => {
    const resultado = SimulationChangeApplier.applyOverrides("BAIXO_RISCO", CONF, []);

    expect(resultado.classe).toBe("BAIXO_RISCO");
    expect(resultado.confianca).toBe(CONF);
  });

  it("sobrescreve só a classificação quando há CLASSIFICACAO_OVERRIDE", () => {
    const resultado = SimulationChangeApplier.applyOverrides("BAIXO_RISCO", CONF, [
      { tipo: "CLASSIFICACAO_OVERRIDE", valor: "ALTO_RISCO" },
    ]);

    expect(resultado.classe).toBe("ALTO_RISCO");
    expect(resultado.confianca).toBe(CONF);
  });

  it("sobrescreve só a confiança quando há CONFIANCA_OVERRIDE", () => {
    const resultado = SimulationChangeApplier.applyOverrides("BAIXO_RISCO", CONF, [
      { tipo: "CONFIANCA_OVERRIDE", valor: 0.3 },
    ]);

    expect(resultado.classe).toBe("BAIXO_RISCO");
    expect(resultado.confianca.toNumber()).toBe(0.3);
  });

  it("aplica os dois overrides juntos", () => {
    const resultado = SimulationChangeApplier.applyOverrides("BAIXO_RISCO", CONF, [
      { tipo: "CLASSIFICACAO_OVERRIDE", valor: "MEDIO_RISCO" },
      { tipo: "CONFIANCA_OVERRIDE", valor: 0.5 },
    ]);

    expect(resultado.classe).toBe("MEDIO_RISCO");
    expect(resultado.confianca.toNumber()).toBe(0.5);
  });
});
