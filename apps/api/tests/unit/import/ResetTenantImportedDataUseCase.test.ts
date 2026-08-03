import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { ResetTenantImportedDataUseCase } from "../../../src/modules/import/application/use-cases/ResetTenantImportedDataUseCase.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeVersionSnapshotRepository } from "../dossier-versioning/fakes.js";
import { FakeImportBatchRepository, FakeTenantResourceOwnershipRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function buildHarness() {
  const dossieRepository = new FakeDossieRepository();
  const versionSnapshotRepository = new FakeVersionSnapshotRepository();
  const importBatchRepository = new FakeImportBatchRepository();
  const ownershipRepository = new FakeTenantResourceOwnershipRepository();

  dossieRepository.seed(
    Dossie.criarVazio({ id: "d-a1", subjectType: "EMPRESA", subjectId: "e1", now: NOW }),
  );
  dossieRepository.seed(
    Dossie.criarVazio({ id: "d-b1", subjectType: "EMPRESA", subjectId: "e2", now: NOW }),
  );
  versionSnapshotRepository.seed(
    VersionSnapshot.create({
      id: "s-a1",
      dossieId: "d-a1",
      versao: 1,
      timestamp: NOW,
      usuarioId: null,
      evidencias: {
        pgfn: { status: "NAO_CONSULTADO" },
        dataJud: { status: "NAO_CONSULTADO" },
        receitaFederal: { status: "NAO_CONSULTADO" },
        portalTransparencia: { status: "NAO_CONSULTADO" },
        cenprot: { status: "NAO_CONSULTADO" },
      },
      classificacao: "BAIXO_RISCO",
      justificativaGeral: "x",
      fatores: [],
      recomendacoes: [],
      prompt: { structured: {}, texto: "v1" },
      confidenceScore: 0,
      riskScore: 0,
      hash: "hash",
    }),
  );
  importBatchRepository.seed(
    ImportBatch.iniciar({
      id: "batch-a1",
      fonte: "EMPRESAS_CADASTRAIS",
      nomeArquivo: "a.xlsx",
      totalLinhas: 1,
      now: NOW,
    }),
  );
  importBatchRepository.seed(
    ImportBatch.iniciar({
      id: "batch-b1",
      fonte: "EMPRESAS_CADASTRAIS",
      nomeArquivo: "b.xlsx",
      totalLinhas: 1,
      now: NOW,
    }),
  );
  ownershipRepository.seed(
    TenantResourceOwnership.create({
      id: "o1",
      tenantId: TENANT_A,
      resourceType: "Dossie",
      resourceId: "d-a1",
      createdAt: NOW,
    }),
  );
  ownershipRepository.seed(
    TenantResourceOwnership.create({
      id: "o2",
      tenantId: TENANT_B,
      resourceType: "Dossie",
      resourceId: "d-b1",
      createdAt: NOW,
    }),
  );
  ownershipRepository.seed(
    TenantResourceOwnership.create({
      id: "o3",
      tenantId: TENANT_A,
      resourceType: "ImportBatch",
      resourceId: "batch-a1",
      createdAt: NOW,
    }),
  );
  ownershipRepository.seed(
    TenantResourceOwnership.create({
      id: "o4",
      tenantId: TENANT_B,
      resourceType: "ImportBatch",
      resourceId: "batch-b1",
      createdAt: NOW,
    }),
  );

  const useCase = new ResetTenantImportedDataUseCase(
    dossieRepository,
    versionSnapshotRepository,
    importBatchRepository,
    ownershipRepository,
  );

  return {
    useCase,
    dossieRepository,
    versionSnapshotRepository,
    importBatchRepository,
    ownershipRepository,
  };
}

describe("ResetTenantImportedDataUseCase", () => {
  it("apaga só os Dossiês/VersionSnapshots/ImportBatches do tenant do chamador, nunca de outro tenant", async () => {
    const {
      useCase,
      dossieRepository,
      versionSnapshotRepository,
      importBatchRepository,
      ownershipRepository,
    } = buildHarness();

    const resultado = await useCase.execute(TENANT_A);

    expect(resultado).toEqual({ dossiesRemovidos: 1, importacoesRemovidas: 1 });

    expect(await dossieRepository.findById("d-a1")).toBeNull();
    expect(await dossieRepository.findById("d-b1")).not.toBeNull();

    expect(await versionSnapshotRepository.findByDossieId("d-a1")).toEqual([]);

    expect(await importBatchRepository.findById("batch-a1")).toBeNull();
    expect(await importBatchRepository.findById("batch-b1")).not.toBeNull();

    expect(await ownershipRepository.listResourceIds(TENANT_A, "Dossie")).toEqual([]);
    expect(await ownershipRepository.listResourceIds(TENANT_A, "ImportBatch")).toEqual([]);
    expect(await ownershipRepository.listResourceIds(TENANT_B, "Dossie")).toEqual(["d-b1"]);
    expect(await ownershipRepository.listResourceIds(TENANT_B, "ImportBatch")).toEqual([
      "batch-b1",
    ]);
  });

  it("não falha para um tenant sem nenhum dado importado", async () => {
    const { useCase } = buildHarness();

    const resultado = await useCase.execute("tenant-sem-dados");

    expect(resultado).toEqual({ dossiesRemovidos: 0, importacoesRemovidas: 0 });
  });
});
