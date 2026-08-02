import { AppError } from "../../../src/application/errors/AppError.js";
import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { FakeDossieRepository } from "../dossie/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

describe("ClassificarDossieUseCase", () => {
  it("classifica um dossiê totalmente vazio como BAIXO_RISCO com confiança 0", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const useCase = new ClassificarDossieUseCase(dossieRepository, [new PendenciaFiscalPgfnRule()]);

    const resultado = await useCase.execute("d1");

    expect(resultado.score.toNumber()).toBe(0);
    expect(resultado.classe).toBe("BAIXO_RISCO");
    expect(resultado.confianca.toNumber()).toBe(0);
    expect(resultado.fatores).toEqual([]);
  });

  it("classifica ALTO_RISCO quando a única regra aplicável aumenta risco", async () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: NOW,
    });
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
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(dossie);
    const useCase = new ClassificarDossieUseCase(dossieRepository, [new PendenciaFiscalPgfnRule()]);

    const resultado = await useCase.execute("d1");

    expect(resultado.score.toNumber()).toBe(1);
    expect(resultado.classe).toBe("ALTO_RISCO");
    expect(resultado.fatores).toHaveLength(1);
    expect(resultado.justificativaGeral).toContain("Pendência Fiscal");
  });

  it("confiança reflete a fração de evidências respondidas, independente do score", async () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: NOW,
    });
    dossie.atualizarEvidencia(
      "PGFN",
      Evidence.encontrada({
        valor: { temPendencia: false },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
      NOW,
    );
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(dossie);
    const useCase = new ClassificarDossieUseCase(dossieRepository, [new PendenciaFiscalPgfnRule()]);

    const resultado = await useCase.execute("d1");

    expect(resultado.confianca.toNumber()).toBe(0.2); // 1 de 5 evidências respondida
  });

  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const useCase = new ClassificarDossieUseCase(new FakeDossieRepository(), []);

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
