import { AppError } from "../../../src/application/errors/AppError.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { GetDossieUseCase } from "../../../src/modules/dossie/application/use-cases/GetDossieUseCase.js";
import { FakeDossieRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("GetDossieUseCase", () => {
  it("retorna o dossiê quando ele existe", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "pessoa-1", now: NOW }),
    );
    const useCase = new GetDossieUseCase(dossieRepository);

    const dossie = await useCase.execute("d1");

    expect(dossie.id).toBe("d1");
  });

  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const useCase = new GetDossieUseCase(new FakeDossieRepository());

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
