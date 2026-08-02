import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { CreateCaseUseCase } from "../../../src/modules/case-management/application/use-cases/CreateCaseUseCase.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import {
  FakeCaseHistoryRepository,
  FakeCaseRepository,
  FakeClock,
  FakeIdGenerator,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("CreateCaseUseCase", () => {
  it("cria o case e registra CASO_CRIADO na timeline", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const caseRepository = new FakeCaseRepository();
    const caseHistoryRepository = new FakeCaseHistoryRepository();

    const useCase = new CreateCaseUseCase(
      caseRepository,
      caseHistoryRepository,
      dossieRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );
    const caso = await useCase.execute({
      dossieId: "d1",
      ownerId: "user-1",
      priority: "ALTA",
      autorId: "user-1",
    });

    expect(caso.status).toBe("ABERTO");
    const persistido = await caseRepository.findById(caso.id);
    expect(persistido).not.toBeNull();
    const timeline = await caseHistoryRepository.findByCaseId(caso.id);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.tipo).toBe("CASO_CRIADO");
  });

  it("lança VALIDATION quando o dossieId não existe", async () => {
    const useCase = new CreateCaseUseCase(
      new FakeCaseRepository(),
      new FakeCaseHistoryRepository(),
      new FakeDossieRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({ dossieId: "inexistente", ownerId: null, priority: "MEDIA", autorId: null }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});
