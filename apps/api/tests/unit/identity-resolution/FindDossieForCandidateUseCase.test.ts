import { FindDossieForCandidateUseCase } from "../../../src/modules/identity-resolution/application/use-cases/FindDossieForCandidateUseCase.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeVersionSnapshotRepository } from "../dossier-versioning/fakes.js";
import { FakeTenantResourceOwnershipRepository } from "../tenant/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function buildHarness() {
  const dossieRepository = new FakeDossieRepository();
  dossieRepository.seed(
    Dossie.criarVazio({ id: "d1", subjectType: "EMPRESA", subjectId: "e1", now: NOW }),
  );

  const versionSnapshotRepository = new FakeVersionSnapshotRepository();
  versionSnapshotRepository.seed(
    VersionSnapshot.create({
      id: "s1",
      dossieId: "d1",
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
      classificacao: "ALTO_RISCO",
      justificativaGeral: "x",
      fatores: [],
      recomendacoes: [],
      prompt: { structured: {}, texto: "v1" },
      confidenceScore: 0.9,
      riskScore: 0.8,
      hash: "hash",
    }),
  );

  const ownershipRepository = new FakeTenantResourceOwnershipRepository();
  ownershipRepository.seed(
    TenantResourceOwnership.create({
      id: "o1",
      tenantId: TENANT_A,
      resourceType: "Dossie",
      resourceId: "d1",
      createdAt: NOW,
    }),
  );

  const useCase = new FindDossieForCandidateUseCase(
    dossieRepository,
    versionSnapshotRepository,
    ownershipRepository,
  );

  return { useCase };
}

describe("FindDossieForCandidateUseCase", () => {
  it("devolve o Dossiê com a classificação/risco mais recentes quando pertence ao tenant do chamador", async () => {
    const { useCase } = buildHarness();

    const resultado = await useCase.execute({
      tenantId: TENANT_A,
      subjectType: "EMPRESA",
      subjectId: "e1",
    });

    expect(resultado).toEqual({ dossieId: "d1", classificacao: "ALTO_RISCO", riskScore: 0.8 });
  });

  it("nunca devolve o Dossiê de outro tenant — trata como se não existisse (fail-closed)", async () => {
    const { useCase } = buildHarness();

    const resultado = await useCase.execute({
      tenantId: TENANT_B,
      subjectType: "EMPRESA",
      subjectId: "e1",
    });

    expect(resultado).toBeNull();
  });

  it("devolve null quando o sujeito não tem nenhum Dossiê ainda", async () => {
    const { useCase } = buildHarness();

    const resultado = await useCase.execute({
      tenantId: TENANT_A,
      subjectType: "EMPRESA",
      subjectId: "sem-dossie",
    });

    expect(resultado).toBeNull();
  });
});
