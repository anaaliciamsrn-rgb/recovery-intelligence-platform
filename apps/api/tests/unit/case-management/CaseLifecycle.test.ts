import { Case } from "../../../src/modules/case-management/domain/entities/Case.js";
import { AddCaseNoteUseCase } from "../../../src/modules/case-management/application/use-cases/AddCaseNoteUseCase.js";
import { GetCaseUseCase } from "../../../src/modules/case-management/application/use-cases/GetCaseUseCase.js";
import { ListCasesUseCase } from "../../../src/modules/case-management/application/use-cases/ListCasesUseCase.js";
import { UpdateCaseDetailsUseCase } from "../../../src/modules/case-management/application/use-cases/UpdateCaseDetailsUseCase.js";
import { UpdateCaseStatusUseCase } from "../../../src/modules/case-management/application/use-cases/UpdateCaseStatusUseCase.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { FakeTenantResourceOwnershipRepository } from "../tenant/fakes.js";
import {
  FakeCaseHistoryRepository,
  FakeCaseNoteRepository,
  FakeCaseRepository,
  FakeClock,
  FakeIdGenerator,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function seedCase(
  caseRepository: FakeCaseRepository,
  overrides: Partial<Parameters<typeof Case.abrir>[0]> = {},
) {
  const caso = Case.abrir({
    id: "c1",
    dossieId: "d1",
    ownerId: null,
    priority: "MEDIA",
    now: NOW,
    ...overrides,
  });
  caseRepository.seed(caso);
  return caso;
}

describe("UpdateCaseStatusUseCase", () => {
  it("transiciona o status e registra na timeline", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository);
    const caseHistoryRepository = new FakeCaseHistoryRepository();
    const useCase = new UpdateCaseStatusUseCase(
      caseRepository,
      caseHistoryRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await useCase.execute({ caseId: "c1", novoStatus: "EM_ANDAMENTO", autorId: "user-1" });

    expect((await caseRepository.findById("c1"))?.status).toBe("EM_ANDAMENTO");
    const timeline = await caseHistoryRepository.findByCaseId("c1");
    expect(timeline[0]?.tipo).toBe("STATUS_ALTERADO");
  });

  it("lança VALIDATION para transição inválida", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository);
    const useCase = new UpdateCaseStatusUseCase(
      caseRepository,
      new FakeCaseHistoryRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({ caseId: "c1", novoStatus: "RESOLVIDO", autorId: null }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });

  it("lança NOT_FOUND quando o case não existe", async () => {
    const useCase = new UpdateCaseStatusUseCase(
      new FakeCaseRepository(),
      new FakeCaseHistoryRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({ caseId: "inexistente", novoStatus: "EM_ANDAMENTO", autorId: null }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("UpdateCaseDetailsUseCase", () => {
  it("atualiza owner/prioridade/tags/próxima ação e registra um evento por campo alterado", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository);
    const caseHistoryRepository = new FakeCaseHistoryRepository();
    const useCase = new UpdateCaseDetailsUseCase(
      caseRepository,
      caseHistoryRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await useCase.execute({
      caseId: "c1",
      autorId: "user-1",
      ownerId: "user-2",
      priority: "URGENTE",
      tags: ["vip"],
      proximaAcao: "Ligar",
    });

    const caso = await caseRepository.findById("c1");
    expect(caso?.ownerId).toBe("user-2");
    expect(caso?.priority).toBe("URGENTE");
    expect(caso?.tags).toEqual(["vip"]);
    expect(caso?.proximaAcao).toBe("Ligar");

    const timeline = await caseHistoryRepository.findByCaseId("c1");
    expect(timeline.map((e) => e.tipo)).toEqual(
      expect.arrayContaining([
        "OWNER_ALTERADO",
        "PRIORIDADE_ALTERADA",
        "TAGS_ALTERADAS",
        "PROXIMA_ACAO_DEFINIDA",
      ]),
    );
  });

  it("não gera nenhum evento quando nada muda", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository, { ownerId: "user-2" });
    const caseHistoryRepository = new FakeCaseHistoryRepository();
    const useCase = new UpdateCaseDetailsUseCase(
      caseRepository,
      caseHistoryRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await useCase.execute({ caseId: "c1", autorId: null, ownerId: "user-2" });

    expect(await caseHistoryRepository.findByCaseId("c1")).toEqual([]);
  });
});

describe("AddCaseNoteUseCase", () => {
  it("adiciona uma nota e registra NOTA_ADICIONADA", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository);
    const caseNoteRepository = new FakeCaseNoteRepository();
    const caseHistoryRepository = new FakeCaseHistoryRepository();
    const useCase = new AddCaseNoteUseCase(
      caseRepository,
      caseNoteRepository,
      caseHistoryRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    const nota = await useCase.execute({
      caseId: "c1",
      autorId: "user-1",
      texto: "Cliente pediu prazo",
    });

    expect(nota.texto).toBe("Cliente pediu prazo");
    expect(await caseNoteRepository.findByCaseId("c1")).toHaveLength(1);
    expect((await caseHistoryRepository.findByCaseId("c1"))[0]?.tipo).toBe("NOTA_ADICIONADA");
  });

  it("lança VALIDATION para nota vazia", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository);
    const useCase = new AddCaseNoteUseCase(
      caseRepository,
      new FakeCaseNoteRepository(),
      new FakeCaseHistoryRepository(),
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await expect(
      useCase.execute({ caseId: "c1", autorId: null, texto: "   " }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });
});

describe("GetCaseUseCase", () => {
  it("devolve o case com notas e timeline juntos", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository);
    const caseNoteRepository = new FakeCaseNoteRepository();
    const caseHistoryRepository = new FakeCaseHistoryRepository();
    await new AddCaseNoteUseCase(
      caseRepository,
      caseNoteRepository,
      caseHistoryRepository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    ).execute({ caseId: "c1", autorId: null, texto: "nota" });

    const useCase = new GetCaseUseCase(caseRepository, caseNoteRepository, caseHistoryRepository);
    const detalhe = await useCase.execute("c1");

    expect(detalhe.caso.id).toBe("c1");
    expect(detalhe.notas).toHaveLength(1);
    expect(detalhe.timeline).toHaveLength(1);
  });

  it("lança NOT_FOUND quando o case não existe", async () => {
    const useCase = new GetCaseUseCase(
      new FakeCaseRepository(),
      new FakeCaseNoteRepository(),
      new FakeCaseHistoryRepository(),
    );

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("ListCasesUseCase", () => {
  it("filtra por status", async () => {
    const caseRepository = new FakeCaseRepository();
    seedCase(caseRepository, { id: "c1" });
    const c2 = Case.abrir({ id: "c2", dossieId: "d2", ownerId: null, priority: "MEDIA", now: NOW });
    c2.transicionarStatus("EM_ANDAMENTO", NOW);
    caseRepository.seed(c2);

    const tenantResourceOwnershipRepository = new FakeTenantResourceOwnershipRepository();
    tenantResourceOwnershipRepository.seed(
      TenantResourceOwnership.create({
        id: "o1",
        tenantId: "tenant-1",
        resourceType: "Dossie",
        resourceId: "d1",
        createdAt: NOW,
      }),
    );
    tenantResourceOwnershipRepository.seed(
      TenantResourceOwnership.create({
        id: "o2",
        tenantId: "tenant-1",
        resourceType: "Dossie",
        resourceId: "d2",
        createdAt: NOW,
      }),
    );

    const useCase = new ListCasesUseCase(caseRepository, tenantResourceOwnershipRepository);
    const pagina = await useCase.execute({
      tenantId: "tenant-1",
      filter: { status: "EM_ANDAMENTO" },
      pagination: { page: 1, pageSize: 10 },
    });

    expect(pagina.items.map((c) => c.id)).toEqual(["c2"]);
  });
});
