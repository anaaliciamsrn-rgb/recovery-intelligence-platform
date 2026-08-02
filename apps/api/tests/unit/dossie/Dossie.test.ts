import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("Dossie", () => {
  it("criarVazio() começa com todas as cinco evidências NAO_CONSULTADO", () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "pessoa-1",
      now: NOW,
    });

    const evidencias = dossie.evidencias;
    expect(evidencias.pgfn.status).toBe("NAO_CONSULTADO");
    expect(evidencias.dataJud.status).toBe("NAO_CONSULTADO");
    expect(evidencias.receitaFederal.status).toBe("NAO_CONSULTADO");
    expect(evidencias.portalTransparencia.status).toBe("NAO_CONSULTADO");
    expect(evidencias.cenprot.status).toBe("NAO_CONSULTADO");
  });

  it("atualizarEvidencia() substitui só a fonte informada, mantendo as demais intactas", () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "EMPRESA",
      subjectId: "empresa-1",
      now: NOW,
    });

    const novaEvidencia = Evidence.encontrada({
      valor: { situacao: "ATIVA" },
      fonte: "RECEITA_FEDERAL",
      dataConsulta: NOW,
      confidenceScore: ConfidenceScore.create(0.95),
    });
    dossie.atualizarEvidencia("RECEITA_FEDERAL", novaEvidencia, NOW);

    expect(dossie.evidencias.receitaFederal.status).toBe("ENCONTRADO");
    expect(dossie.evidencias.pgfn.status).toBe("NAO_CONSULTADO");
    expect(dossie.evidencias.dataJud.status).toBe("NAO_CONSULTADO");
  });

  it("atualizarEvidencia() atualiza updatedAt", () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "pessoa-1",
      now: NOW,
    });
    const depois = new Date("2026-02-01T00:00:00Z");

    dossie.atualizarEvidencia("CENPROT", Evidence.naoConsultada({ fonte: "CENPROT" }), depois);

    expect(dossie.updatedAt).toEqual(depois);
  });
});
