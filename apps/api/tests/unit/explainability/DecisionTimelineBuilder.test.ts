import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { DecisionTimelineBuilder } from "../../../src/modules/explainability/domain/services/DecisionTimelineBuilder.js";

const CRIADO_EM = new Date("2026-01-01T00:00:00Z");
const ATUALIZADO_EM = new Date("2026-01-02T00:00:00Z");
const CLASSIFICACAO_EM = new Date("2026-01-03T00:00:00Z");
const RECOMENDACAO_EM = new Date("2026-01-03T00:00:01Z");
const PROMPT_EM = new Date("2026-01-03T00:00:02Z");
const CONF = ConfidenceScore.create(0.9);

describe("DecisionTimelineBuilder", () => {
  it("monta as seis etapas na ordem fixa, com timestamp null para fontes nunca consultadas", () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: CRIADO_EM,
    });

    const timeline = DecisionTimelineBuilder.build({
      dossieCreatedAt: dossie.createdAt,
      dossieUpdatedAt: dossie.updatedAt,
      evidencias: dossie.evidencias,
      classificacaoExecutadaEm: CLASSIFICACAO_EM,
      recomendacaoGeradaEm: RECOMENDACAO_EM,
      promptCriadoEm: PROMPT_EM,
    });

    expect(timeline.map((evento) => evento.etapa)).toEqual([
      "CONSULTA_INICIADA",
      "FONTES_CONSULTADAS",
      "DOSSIE_ATUALIZADO",
      "CLASSIFICACAO_EXECUTADA",
      "RECOMENDACAO_GERADA",
      "PROMPT_CRIADO",
    ]);
    expect(timeline[0]?.timestamp).toEqual(CRIADO_EM);
    expect(timeline[1]?.timestamp).toBeNull();
    expect(timeline[1]?.descricao).toContain("Nenhuma fonte");
    expect(timeline[3]?.timestamp).toEqual(CLASSIFICACAO_EM);
    expect(timeline[4]?.timestamp).toEqual(RECOMENDACAO_EM);
    expect(timeline[5]?.timestamp).toEqual(PROMPT_EM);
  });

  it("usa a data de consulta mais recente entre as evidências para FONTES_CONSULTADAS", () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: CRIADO_EM,
    });
    const consultaAntiga = new Date("2026-01-01T10:00:00Z");
    const consultaRecente = new Date("2026-01-01T15:00:00Z");

    dossie.atualizarEvidencia(
      "PGFN",
      Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: consultaAntiga,
        confidenceScore: CONF,
      }),
      ATUALIZADO_EM,
    );
    dossie.atualizarEvidencia(
      "DATAJUD",
      Evidence.naoEncontrada({
        fonte: "DATAJUD",
        dataConsulta: consultaRecente,
        confidenceScore: CONF,
      }),
      ATUALIZADO_EM,
    );

    const timeline = DecisionTimelineBuilder.build({
      dossieCreatedAt: dossie.createdAt,
      dossieUpdatedAt: dossie.updatedAt,
      evidencias: dossie.evidencias,
      classificacaoExecutadaEm: CLASSIFICACAO_EM,
      recomendacaoGeradaEm: RECOMENDACAO_EM,
      promptCriadoEm: PROMPT_EM,
    });

    expect(timeline[1]?.timestamp).toEqual(consultaRecente);
    expect(timeline[2]?.timestamp).toEqual(ATUALIZADO_EM);
  });
});
