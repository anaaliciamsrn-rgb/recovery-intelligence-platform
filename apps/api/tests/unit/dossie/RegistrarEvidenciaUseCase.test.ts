import { AppError } from "../../../src/application/errors/AppError.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { RegistrarEvidenciaUseCase } from "../../../src/modules/dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import { FakeClock, FakeDossieRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildUseCase() {
  const dossieRepository = new FakeDossieRepository();
  dossieRepository.seed(
    Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "pessoa-1", now: NOW }),
  );
  const useCase = new RegistrarEvidenciaUseCase(dossieRepository, new FakeClock(NOW));

  return { useCase, dossieRepository };
}

describe("RegistrarEvidenciaUseCase", () => {
  it("registra uma evidência ENCONTRADO", async () => {
    const { useCase, dossieRepository } = buildUseCase();

    await useCase.execute({
      dossieId: "d1",
      fonte: "PGFN",
      status: "ENCONTRADO",
      valor: { debitos: 3 },
      confidenceScore: 0.85,
      motivoErro: null,
    });

    const dossie = await dossieRepository.findById("d1");
    expect(dossie?.evidencias.pgfn.status).toBe("ENCONTRADO");
  });

  it("registra uma evidência ERRO_CONSULTA com motivoErro", async () => {
    const { useCase, dossieRepository } = buildUseCase();

    await useCase.execute({
      dossieId: "d1",
      fonte: "DATAJUD",
      status: "ERRO_CONSULTA",
      valor: null,
      confidenceScore: null,
      motivoErro: "timeout",
    });

    const dossie = await dossieRepository.findById("d1");
    expect(dossie?.evidencias.dataJud.status).toBe("ERRO_CONSULTA");
  });

  it("rejeita ERRO_CONSULTA sem motivoErro", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        dossieId: "d1",
        fonte: "CENPROT",
        status: "ERRO_CONSULTA",
        valor: null,
        confidenceScore: null,
        motivoErro: null,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });

  it("rejeita ENCONTRADO sem confidenceScore", async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        dossieId: "d1",
        fonte: "PGFN",
        status: "ENCONTRADO",
        valor: "x",
        confidenceScore: null,
        motivoErro: null,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" } satisfies Partial<AppError>);
  });

  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const useCase = new RegistrarEvidenciaUseCase(new FakeDossieRepository(), new FakeClock(NOW));

    await expect(
      useCase.execute({
        dossieId: "inexistente",
        fonte: "PGFN",
        status: "NAO_CONSULTADO",
        valor: null,
        confidenceScore: null,
        motivoErro: null,
      }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" } satisfies Partial<AppError>);
  });
});
