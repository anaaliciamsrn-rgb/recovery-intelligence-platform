import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { Fator } from "../../../src/modules/classification/domain/value-objects/Fator.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { ConfidenceHeatmapBuilder } from "../../../src/modules/confidence-heatmap/domain/services/ConfidenceHeatmapBuilder.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildEvidencias() {
  return Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW })
    .evidencias;
}

describe("ConfidenceHeatmapBuilder", () => {
  it("marca todas as fontes como ausentes quando o dossiê está vazio", () => {
    const { fontesAusentes, entradas } = ConfidenceHeatmapBuilder.build(buildEvidencias(), []);

    expect(fontesAusentes).toHaveLength(5);
    expect(
      entradas.every(
        (entrada) => entrada.confidenceScore === null && entrada.contribuicaoPercentual === 0,
      ),
    ).toBe(true);
  });

  it("calcula a contribuição percentual proporcional à confidenceScore de cada fonte respondida", () => {
    const evidencias = {
      ...buildEvidencias(),
      pgfn: Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: ConfidenceScore.create(0.6),
      }),
      dataJud: Evidence.encontrada({
        valor: { temProcesso: false },
        fonte: "DATAJUD",
        dataConsulta: NOW,
        confidenceScore: ConfidenceScore.create(0.4),
      }),
    };

    const { entradas, fontesAusentes } = ConfidenceHeatmapBuilder.build(evidencias, []);

    const pgfn = entradas.find((entrada) => entrada.fonte === "PGFN");
    const dataJud = entradas.find((entrada) => entrada.fonte === "DATAJUD");
    expect(pgfn?.contribuicaoPercentual).toBe(60);
    expect(dataJud?.contribuicaoPercentual).toBe(40);
    expect(fontesAusentes).toHaveLength(3);
  });

  it("não detecta conflito quando todos os fatores apontam na mesma direção", () => {
    const fatores = [
      Fator.create({
        nome: "Pendência Fiscal (PGFN)",
        peso: 0.4,
        direcao: "AUMENTA_RISCO",
        justificativa: "x",
      }),
    ];

    expect(ConfidenceHeatmapBuilder.build(buildEvidencias(), fatores).fontesConflitantes).toEqual(
      [],
    );
  });

  it("detecta conflito quando fatores apontam em direções opostas", () => {
    const fatores = [
      Fator.create({
        nome: "Pendência Fiscal (PGFN)",
        peso: 0.4,
        direcao: "AUMENTA_RISCO",
        justificativa: "x",
      }),
      Fator.create({
        nome: "Situação Cadastral (Receita Federal)",
        peso: 0.25,
        direcao: "REDUZ_RISCO",
        justificativa: "y",
      }),
    ];

    const { fontesConflitantes } = ConfidenceHeatmapBuilder.build(buildEvidencias(), fatores);

    expect(fontesConflitantes).toEqual(expect.arrayContaining(["PGFN", "RECEITA_FEDERAL"]));
  });
});
