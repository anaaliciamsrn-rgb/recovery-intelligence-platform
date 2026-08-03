import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { ListImportBatchesUseCase } from "../../../src/modules/import/application/use-cases/ListImportBatchesUseCase.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { FakeImportBatchRepository, FakeTenantResourceOwnershipRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function seedBatch(
  batchRepository: FakeImportBatchRepository,
  ownershipRepository: FakeTenantResourceOwnershipRepository,
  input: { id: string; nomeArquivo: string; totalLinhas: number; tenantId: string },
): void {
  batchRepository.seed(
    ImportBatch.iniciar({
      id: input.id,
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: input.nomeArquivo,
      totalLinhas: input.totalLinhas,
      now: NOW,
    }),
  );
  ownershipRepository.seed(
    TenantResourceOwnership.create({
      id: `ownership-${input.id}`,
      tenantId: input.tenantId,
      resourceType: "ImportBatch",
      resourceId: input.id,
      createdAt: NOW,
    }),
  );
}

describe("ListImportBatchesUseCase", () => {
  it("lista só os lotes do tenant do chamador (ADR 0037)", async () => {
    const batchRepository = new FakeImportBatchRepository();
    const ownershipRepository = new FakeTenantResourceOwnershipRepository();
    seedBatch(batchRepository, ownershipRepository, {
      id: "lote-1",
      nomeArquivo: "a.xlsx",
      totalLinhas: 1,
      tenantId: TENANT_A,
    });
    seedBatch(batchRepository, ownershipRepository, {
      id: "lote-2",
      nomeArquivo: "b.xlsx",
      totalLinhas: 2,
      tenantId: TENANT_B,
    });
    const useCase = new ListImportBatchesUseCase(batchRepository, ownershipRepository);

    const pagina = await useCase.execute(TENANT_A);

    expect(pagina.items).toHaveLength(1);
    expect(pagina.total).toBe(1);
    expect(pagina.items[0]?.id).toBe("lote-1");
  });

  it("devolve página vazia quando o tenant não tem nenhum lote ainda", async () => {
    const useCase = new ListImportBatchesUseCase(
      new FakeImportBatchRepository(),
      new FakeTenantResourceOwnershipRepository(),
    );
    const pagina = await useCase.execute(TENANT_A);
    expect(pagina.items).toEqual([]);
    expect(pagina.total).toBe(0);
  });

  it("pagina os resultados dentro do próprio tenant", async () => {
    const batchRepository = new FakeImportBatchRepository();
    const ownershipRepository = new FakeTenantResourceOwnershipRepository();
    seedBatch(batchRepository, ownershipRepository, {
      id: "lote-1",
      nomeArquivo: "a.xlsx",
      totalLinhas: 1,
      tenantId: TENANT_A,
    });
    seedBatch(batchRepository, ownershipRepository, {
      id: "lote-2",
      nomeArquivo: "b.xlsx",
      totalLinhas: 2,
      tenantId: TENANT_A,
    });
    seedBatch(batchRepository, ownershipRepository, {
      id: "lote-3",
      nomeArquivo: "c.xlsx",
      totalLinhas: 3,
      tenantId: TENANT_A,
    });
    const useCase = new ListImportBatchesUseCase(batchRepository, ownershipRepository);

    const primeiraPagina = await useCase.execute(TENANT_A, { page: 1, pageSize: 2 });
    expect(primeiraPagina.items).toHaveLength(2);
    expect(primeiraPagina.total).toBe(3);
  });
});
