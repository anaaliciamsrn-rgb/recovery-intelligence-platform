import { CreateDossieUseCase } from "../../../src/modules/dossie/application/use-cases/CreateDossieUseCase.js";
import { RegistrarEvidenciaUseCase } from "../../../src/modules/dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import { ResolveIdentityUseCase } from "../../../src/modules/identity-resolution/application/use-cases/ResolveIdentityUseCase.js";
import type { IIdentityResolutionStrategy } from "../../../src/modules/identity-resolution/application/ports/IIdentityResolutionStrategy.js";
import { MatchSignal } from "../../../src/modules/identity-resolution/domain/value-objects/MatchSignal.js";
import { ImportRow } from "../../../src/modules/import/domain/entities/ImportRow.js";
import { ResolveImportRowIdentityUseCase } from "../../../src/modules/import/application/use-cases/ResolveImportRowIdentityUseCase.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { FakeIdentityResolutionSourceProvider } from "../identity-resolution/fakes.js";
import { FakeClock, FakeDossieRepository, FakeIdGenerator } from "../dossie/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";
import { FakeImportRowRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

class FavorableStrategy implements IIdentityResolutionStrategy {
  compare(): MatchSignal[] {
    return [MatchSignal.create({ tipo: "FAKE", peso: 1, favoravel: true, descricao: "fake" })];
  }
}

class UnfavorableStrategy implements IIdentityResolutionStrategy {
  compare(): MatchSignal[] {
    return [MatchSignal.create({ tipo: "FAKE", peso: 1, favoravel: false, descricao: "fake" })];
  }
}

function buildRow(overrides: Partial<Parameters<typeof ImportRow.create>[0]> = {}): ImportRow {
  return ImportRow.create({
    id: "linha-1",
    importBatchId: "lote-1",
    numeroLinha: 14,
    status: "IMPORTADA",
    resolutionStatus: "PENDENTE",
    pessoaId: null,
    dossieId: null,
    documentoMascarado: "***.982.247-**",
    nome: "FULANO DE TAL",
    nomeFantasia: null,
    valorTotal: 100,
    valorDividaSelecionada: 100,
    naturezaDivida: null,
    motivo: null,
    createdAt: NOW,
    ...overrides,
  });
}

function buildDeps(strategy: IIdentityResolutionStrategy) {
  const rowRepository = new FakeImportRowRepository();
  const dossieRepository = new FakeDossieRepository();
  const pessoaRepository = new FakePessoaRepository();
  const empresaRepository = new FakeEmpresaRepository();
  pessoaRepository.seed(
    Pessoa.create({
      id: "pessoa-1",
      cpf: CPF.create("52998224725"),
      nome: "FULANO DE TAL",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );

  const sourceProvider = new FakeIdentityResolutionSourceProvider("INTERNAL", [
    { id: "pessoa-1", sourceType: "INTERNAL", documento: "52998224725", nome: "FULANO DE TAL" },
  ]);
  const resolveIdentityUseCase = new ResolveIdentityUseCase([sourceProvider], strategy);
  const idGenerator = new FakeIdGenerator();
  const clock = new FakeClock(NOW);
  const createDossieUseCase = new CreateDossieUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    idGenerator,
    clock,
  );
  const registrarEvidenciaUseCase = new RegistrarEvidenciaUseCase(dossieRepository, clock);

  const useCase = new ResolveImportRowIdentityUseCase(
    rowRepository,
    resolveIdentityUseCase,
    createDossieUseCase,
    registrarEvidenciaUseCase,
  );

  return { useCase, rowRepository, dossieRepository };
}

describe("ResolveImportRowIdentityUseCase", () => {
  it("resolve a linha, cria o dossiê e registra a evidência quando há MATCH", async () => {
    const { useCase, rowRepository, dossieRepository } = buildDeps(new FavorableStrategy());
    rowRepository.seed(buildRow());

    const resultado = await useCase.execute("lote-1");

    expect(resultado).toEqual({
      totalProcessadas: 1,
      totalResolvidas: 1,
      totalSemCorrespondencia: 0,
    });
    const linha = await rowRepository.findById("linha-1");
    expect(linha?.resolutionStatus).toBe("RESOLVIDA");
    expect(linha?.pessoaId).toBe("pessoa-1");
    expect(linha?.dossieId).not.toBeNull();

    const dossie = await dossieRepository.findById(linha!.dossieId!);
    expect(dossie?.evidencias.pgfn.status).toBe("ENCONTRADO");
  });

  it("marca sem correspondência quando não há MATCH", async () => {
    const { useCase, rowRepository } = buildDeps(new UnfavorableStrategy());
    rowRepository.seed(buildRow());

    const resultado = await useCase.execute("lote-1");

    expect(resultado).toEqual({
      totalProcessadas: 1,
      totalResolvidas: 0,
      totalSemCorrespondencia: 1,
    });
    const linha = await rowRepository.findById("linha-1");
    expect(linha?.resolutionStatus).toBe("SEM_CORRESPONDENCIA");
    expect(linha?.dossieId).toBeNull();
  });

  it("marca sem correspondência quando a linha não tem documento mascarado", async () => {
    const { useCase, rowRepository } = buildDeps(new FavorableStrategy());
    rowRepository.seed(buildRow({ documentoMascarado: null }));

    const resultado = await useCase.execute("lote-1");

    expect(resultado.totalSemCorrespondencia).toBe(1);
  });

  it("ignora linhas que não estão IMPORTADA/PENDENTE", async () => {
    const { useCase, rowRepository } = buildDeps(new FavorableStrategy());
    rowRepository.seed(buildRow({ status: "DUPLICADA" }));

    const resultado = await useCase.execute("lote-1");

    expect(resultado).toEqual({
      totalProcessadas: 0,
      totalResolvidas: 0,
      totalSemCorrespondencia: 0,
    });
  });
});
