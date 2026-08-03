import { GetAnalyticsSummaryUseCase } from "../../../src/modules/analytics/application/use-cases/GetAnalyticsSummaryUseCase.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { Empresa } from "../../../src/modules/party/domain/entities/Empresa.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeVersionSnapshotRepository } from "../dossier-versioning/fakes.js";
import { FakeTenantResourceOwnershipRepository } from "../import/fakes.js";
import { FakeEmpresaRepository } from "../party/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function seedSnapshot(
  repository: FakeVersionSnapshotRepository,
  input: { id: string; dossieId: string; classificacao: string },
): void {
  repository.seed(
    VersionSnapshot.create({
      id: input.id,
      dossieId: input.dossieId,
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
      classificacao: input.classificacao,
      justificativaGeral: "x",
      fatores: [],
      recomendacoes: [],
      prompt: { structured: {}, texto: "v1" },
      confidenceScore: 0,
      riskScore: 0,
      hash: "hash",
    }),
  );
}

describe("GetAnalyticsSummaryUseCase", () => {
  it("agrega KPIs só dos Dossiês e importações do tenant do chamador (ADR 0037)", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d-a1", subjectType: "EMPRESA", subjectId: "e1", now: NOW }),
    );
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d-b1", subjectType: "EMPRESA", subjectId: "e2", now: NOW }),
    );

    const empresaRepository = new FakeEmpresaRepository();
    empresaRepository.seed(
      Empresa.create({
        id: "e1",
        cnpj: CNPJ.create("11.222.333/0001-81"),
        razaoSocial: "Empresa A LTDA",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    empresaRepository.seed(
      Empresa.create({
        id: "e2",
        cnpj: CNPJ.create("22.333.444/0001-81"),
        razaoSocial: "Empresa B LTDA",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    seedSnapshot(versionSnapshotRepository, {
      id: "s-a1",
      dossieId: "d-a1",
      classificacao: "BAIXO_RISCO",
    });
    seedSnapshot(versionSnapshotRepository, {
      id: "s-b1",
      dossieId: "d-b1",
      classificacao: "ALTO_RISCO",
    });

    const ownershipRepository = new FakeTenantResourceOwnershipRepository();
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

    const useCase = new GetAnalyticsSummaryUseCase(
      dossieRepository,
      versionSnapshotRepository,
      ownershipRepository,
      empresaRepository,
    );

    const resumoTenantA = await useCase.execute(TENANT_A);
    expect(resumoTenantA.totalEmpresas).toBe(1);
    expect(resumoTenantA.totalDossiesAnalisados).toBe(1);
    expect(resumoTenantA.totalImportacoes).toBe(1);
    expect(resumoTenantA.distribuicaoRisco).toEqual({ BAIXO_RISCO: 1 });
    expect(resumoTenantA.empresasEmMaiorRisco).toEqual([
      { dossieId: "d-a1", nome: "Empresa A LTDA", riskScore: 0, classificacao: "BAIXO_RISCO" },
    ]);

    const resumoTenantB = await useCase.execute(TENANT_B);
    expect(resumoTenantB.totalEmpresas).toBe(1);
    expect(resumoTenantB.distribuicaoRisco).toEqual({ ALTO_RISCO: 1 });
    expect(resumoTenantB.empresasEmMaiorRisco).toEqual([
      { dossieId: "d-b1", nome: "Empresa B LTDA", riskScore: 0, classificacao: "ALTO_RISCO" },
    ]);
  });

  it("devolve um resumo zerado para um tenant sem nenhuma importação ainda (nunca dados de outro tenant)", async () => {
    const useCase = new GetAnalyticsSummaryUseCase(
      new FakeDossieRepository(),
      new FakeVersionSnapshotRepository(),
      new FakeTenantResourceOwnershipRepository(),
      new FakeEmpresaRepository(),
    );

    const resumo = await useCase.execute("tenant-novo-sem-dados");

    expect(resumo.totalPessoas).toBe(0);
    expect(resumo.totalEmpresas).toBe(0);
    expect(resumo.totalDossiesAnalisados).toBe(0);
    expect(resumo.totalImportacoes).toBe(0);
    expect(resumo.distribuicaoRisco).toEqual({});
  });
});
