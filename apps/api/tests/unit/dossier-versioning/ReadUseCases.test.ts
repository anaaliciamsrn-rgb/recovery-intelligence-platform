import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { VersionSnapshot } from "../../../src/modules/dossier-versioning/domain/entities/VersionSnapshot.js";
import { DiffDossieVersionsUseCase } from "../../../src/modules/dossier-versioning/application/use-cases/DiffDossieVersionsUseCase.js";
import { GetDossieVersionUseCase } from "../../../src/modules/dossier-versioning/application/use-cases/GetDossieVersionUseCase.js";
import { ListDossieVersionsUseCase } from "../../../src/modules/dossier-versioning/application/use-cases/ListDossieVersionsUseCase.js";
import type { DossieEvidenciasSnapshot } from "../../../src/modules/dossier-versioning/domain/value-objects/SnapshotContent.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeVersionSnapshotRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

const EVIDENCIAS_VAZIAS: DossieEvidenciasSnapshot = {
  pgfn: { status: "NAO_CONSULTADO" },
  dataJud: { status: "NAO_CONSULTADO" },
  receitaFederal: { status: "NAO_CONSULTADO" },
  portalTransparencia: { status: "NAO_CONSULTADO" },
  cenprot: { status: "NAO_CONSULTADO" },
};

function buildSnapshot(overrides: Partial<Parameters<typeof VersionSnapshot.create>[0]> = {}) {
  return VersionSnapshot.create({
    id: `snap-${overrides.versao ?? 1}`,
    dossieId: "d1",
    versao: 1,
    timestamp: NOW,
    usuarioId: "user-1",
    evidencias: EVIDENCIAS_VAZIAS,
    classificacao: "BAIXO_RISCO",
    justificativaGeral: "x",
    fatores: [],
    recomendacoes: [],
    prompt: { structured: {}, texto: "v1" },
    confidenceScore: 0,
    riskScore: 0,
    hash: "hash",
    ...overrides,
  });
}

describe("ListDossieVersionsUseCase", () => {
  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const useCase = new ListDossieVersionsUseCase(
      new FakeDossieRepository(),
      new FakeVersionSnapshotRepository(),
    );

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("devolve a timeline ordenada por versão quando o dossiê existe", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    versionSnapshotRepository.seed(buildSnapshot({ versao: 2 }));
    versionSnapshotRepository.seed(buildSnapshot({ versao: 1 }));

    const useCase = new ListDossieVersionsUseCase(dossieRepository, versionSnapshotRepository);
    const timeline = await useCase.execute("d1");

    expect(timeline.map((entrada) => entrada.versao)).toEqual([1, 2]);
  });

  it("devolve lista vazia quando o dossiê existe mas ainda não tem versões", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d2", subjectType: "PESSOA", subjectId: "p2", now: NOW }),
    );

    const useCase = new ListDossieVersionsUseCase(
      dossieRepository,
      new FakeVersionSnapshotRepository(),
    );
    expect(await useCase.execute("d2")).toEqual([]);
  });
});

describe("GetDossieVersionUseCase", () => {
  it("devolve a versão quando existe", async () => {
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    versionSnapshotRepository.seed(buildSnapshot({ versao: 1 }));
    const useCase = new GetDossieVersionUseCase(versionSnapshotRepository);

    const snapshot = await useCase.execute("d1", 1);
    expect(snapshot.versao).toBe(1);
  });

  it("lança NOT_FOUND quando a versão não existe", async () => {
    const useCase = new GetDossieVersionUseCase(new FakeVersionSnapshotRepository());

    await expect(useCase.execute("d1", 99)).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});

describe("DiffDossieVersionsUseCase", () => {
  it("compara duas versões existentes", async () => {
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    versionSnapshotRepository.seed(buildSnapshot({ versao: 1, riskScore: 0 }));
    versionSnapshotRepository.seed(
      buildSnapshot({ versao: 2, riskScore: 1, classificacao: "ALTO_RISCO" }),
    );
    const useCase = new DiffDossieVersionsUseCase(versionSnapshotRepository);

    const diff = await useCase.execute("d1", 1, 2);

    expect(diff.riskScore).toEqual({ anterior: 0, atual: 1, mudou: true });
  });

  it("lança NOT_FOUND quando a primeira versão não existe", async () => {
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    versionSnapshotRepository.seed(buildSnapshot({ versao: 2 }));
    const useCase = new DiffDossieVersionsUseCase(versionSnapshotRepository);

    await expect(useCase.execute("d1", 1, 2)).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("lança NOT_FOUND quando a segunda versão não existe", async () => {
    const versionSnapshotRepository = new FakeVersionSnapshotRepository();
    versionSnapshotRepository.seed(buildSnapshot({ versao: 1 }));
    const useCase = new DiffDossieVersionsUseCase(versionSnapshotRepository);

    await expect(useCase.execute("d1", 1, 2)).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});
