import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../../../src/modules/classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../../../src/modules/classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { CreateDossieUseCase } from "../../../src/modules/dossie/application/use-cases/CreateDossieUseCase.js";
import { RegistrarEvidenciaUseCase } from "../../../src/modules/dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import { CreateVersionSnapshotUseCase } from "../../../src/modules/dossier-versioning/application/use-cases/CreateVersionSnapshotUseCase.js";
import { SnapshotBuilder } from "../../../src/modules/dossier-versioning/application/services/SnapshotBuilder.js";
import type {
  IEmpresaSpreadsheetParser,
  ParsedEmpresaBatch,
} from "../../../src/modules/import/application/ports/IEmpresaSpreadsheetParser.js";
import { ImportEmpresasSpreadsheetUseCase } from "../../../src/modules/import/application/use-cases/ImportEmpresasSpreadsheetUseCase.js";
import { SimulatedEmpresaEvidenceProvider } from "../../../src/modules/import/infrastructure/SimulatedEmpresaEvidenceProvider.js";
import { SimulatedEmpresaOwnershipProvider } from "../../../src/modules/import/infrastructure/SimulatedEmpresaOwnershipProvider.js";
import { Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";
import { RegisterTenantResourceUseCase } from "../../../src/modules/tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { BuildPromptUseCase } from "../../../src/modules/prompt-builder/application/use-cases/BuildPromptUseCase.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { CreateCaseUseCase } from "../../../src/modules/case-management/application/use-cases/CreateCaseUseCase.js";
import { UpdateCaseDetailsUseCase } from "../../../src/modules/case-management/application/use-cases/UpdateCaseDetailsUseCase.js";
import {
  FakeCaseHistoryRepository,
  FakeCaseNoteRepository,
  FakeCaseRepository,
  FakeClock as FakeCaseClock,
  FakeIdGenerator as FakeCaseIdGenerator,
} from "../case-management/fakes.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import {
  FakeClock as FakeVersioningClock,
  FakeIdGenerator as FakeVersioningIdGenerator,
  FakeVersionSnapshotRepository,
} from "../dossier-versioning/fakes.js";
import {
  FakeEmpresaRepository,
  FakeParticipacaoSocietariaRepository,
  FakePessoaRepository,
} from "../party/fakes.js";
import {
  FakeClock,
  FakeIdGenerator,
  FakeImportBatchRepository,
  FakeReceitaFederalProvider,
  FakeTenantRepository,
  FakeTenantResourceOwnershipRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const TENANT_ID = "tenant-1";

class FakeEmpresaSpreadsheetParser implements IEmpresaSpreadsheetParser {
  constructor(private readonly result: ParsedEmpresaBatch) {}

  parse(): ParsedEmpresaBatch {
    return this.result;
  }
}

function buildHarness(parsed: ParsedEmpresaBatch) {
  const importBatchRepository = new FakeImportBatchRepository();
  const empresaRepository = new FakeEmpresaRepository();
  const pessoaRepository = new FakePessoaRepository();
  const dossieRepository = new FakeDossieRepository();
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

  const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, [
    new PendenciaFiscalPgfnRule(),
    new ProcessoJudicialDataJudRule(),
    new SituacaoCadastralReceitaRule(),
  ]);
  const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, [
    new RecomendarCobrancaAmigavelRule(),
  ]);
  const buildPromptUseCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );
  const versionSnapshotRepository = new FakeVersionSnapshotRepository();
  const snapshotBuilder = new SnapshotBuilder(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
  );
  const createVersionSnapshotUseCase = new CreateVersionSnapshotUseCase(
    snapshotBuilder,
    versionSnapshotRepository,
    new FakeVersioningIdGenerator(),
    new FakeVersioningClock(NOW),
  );

  const tenantRepository = new FakeTenantRepository();
  tenantRepository.seed(
    Tenant.create({
      id: TENANT_ID,
      nome: "Empresa Cliente Um",
      slug: "empresa-cliente-um",
      ativo: true,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  const tenantResourceOwnershipRepository = new FakeTenantResourceOwnershipRepository();
  const registerTenantResourceUseCase = new RegisterTenantResourceUseCase(
    tenantRepository,
    tenantResourceOwnershipRepository,
    idGenerator,
    clock,
  );

  const participacaoRepository = new FakeParticipacaoSocietariaRepository();

  const caseRepository = new FakeCaseRepository();
  const caseHistoryRepository = new FakeCaseHistoryRepository();
  const caseNoteRepository = new FakeCaseNoteRepository();
  const caseIdGenerator = new FakeCaseIdGenerator();
  const caseClock = new FakeCaseClock(NOW);
  const createCaseUseCase = new CreateCaseUseCase(
    caseRepository,
    caseHistoryRepository,
    dossieRepository,
    caseIdGenerator,
    caseClock,
  );
  const updateCaseDetailsUseCase = new UpdateCaseDetailsUseCase(
    caseRepository,
    caseHistoryRepository,
    caseIdGenerator,
    caseClock,
  );

  const useCase = new ImportEmpresasSpreadsheetUseCase(
    new FakeEmpresaSpreadsheetParser(parsed),
    importBatchRepository,
    empresaRepository,
    createDossieUseCase,
    registrarEvidenciaUseCase,
    createVersionSnapshotUseCase,
    new SimulatedEmpresaEvidenceProvider(),
    registerTenantResourceUseCase,
    pessoaRepository,
    participacaoRepository,
    new SimulatedEmpresaOwnershipProvider(),
    createCaseUseCase,
    updateCaseDetailsUseCase,
    caseNoteRepository,
    new FakeReceitaFederalProvider(),
    idGenerator,
    clock,
  );

  return {
    useCase,
    importBatchRepository,
    empresaRepository,
    pessoaRepository,
    participacaoRepository,
    dossieRepository,
    versionSnapshotRepository,
    tenantResourceOwnershipRepository,
    caseRepository,
  };
}

describe("ImportEmpresasSpreadsheetUseCase", () => {
  it("importa uma linha válida: cadastra a Empresa, cria o Dossiê, preenche evidências e gera um VersionSnapshot", async () => {
    const {
      useCase,
      empresaRepository,
      versionSnapshotRepository,
      tenantResourceOwnershipRepository,
    } = buildHarness({
      rows: [
        {
          numeroLinha: 2,
          cnpj: "11.222.333/0001-81",
          razaoSocial: "Empresa Válida LTDA",
          nomeFantasia: "Empresa Válida",
          telefone: "(11) 4000-0000",
          email: "contato@empresavalida.com.br",
          cidade: "São Paulo",
          uf: "SP",
          responsavel: "Fulano de Tal",
        },
      ],
    });

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "empresas.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: "user-1",
    });

    expect(resultado.totalLinhas).toBe(1);
    expect(resultado.contagens.importadas).toBe(1);
    expect(resultado.dossiesCriados).toBe(1);

    const empresas = await empresaRepository.findAll();
    expect(empresas).toHaveLength(1);
    expect(empresas[0]?.razaoSocial).toBe("Empresa Válida LTDA");

    const snapshots = await versionSnapshotRepository.findAll();
    expect(snapshots).toHaveLength(1);
    expect(["BAIXO_RISCO", "MEDIO_RISCO", "ALTO_RISCO"]).toContain(snapshots[0]?.classificacao);

    const dossieOwnership = await tenantResourceOwnershipRepository.findByResource(
      "Dossie",
      snapshots[0]!.dossieId,
    );
    expect(dossieOwnership?.tenantId).toBe(TENANT_ID);

    const batchOwnership = await tenantResourceOwnershipRepository.findByResource(
      "ImportBatch",
      resultado.importBatchId,
    );
    expect(batchOwnership?.tenantId).toBe(TENANT_ID);
  });

  it("gera sócios/administradores fictícios (usando o Responsável da planilha) e abre um Case só quando a classificação não é BAIXO_RISCO", async () => {
    const {
      useCase,
      empresaRepository,
      participacaoRepository,
      versionSnapshotRepository,
      caseRepository,
    } = buildHarness({
      rows: [
        {
          numeroLinha: 2,
          cnpj: "11.222.333/0001-81",
          razaoSocial: "Empresa Válida LTDA",
          nomeFantasia: "Empresa Válida",
          telefone: "(11) 4000-0000",
          email: "contato@empresavalida.com.br",
          cidade: "São Paulo",
          uf: "SP",
          responsavel: "Fulano de Tal",
        },
      ],
    });

    await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "empresas.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: "user-1",
    });

    const empresa = (await empresaRepository.findAll())[0]!;
    const socios = await participacaoRepository.findByEmpresaId(empresa.id);
    expect(socios.length).toBeGreaterThanOrEqual(1);
    expect(socios.some((s) => s.papel === "SOCIO_ADMINISTRADOR")).toBe(true);

    const snapshot = (await versionSnapshotRepository.findAll())[0]!;
    const casosDoDossie = (
      await caseRepository.findMany({ dossieId: snapshot.dossieId }, { page: 1, pageSize: 10 })
    ).items;

    if (snapshot.classificacao === "BAIXO_RISCO") {
      expect(casosDoDossie).toHaveLength(0);
    } else {
      expect(casosDoDossie).toHaveLength(1);
      expect(casosDoDossie[0]?.priority).toBe(
        snapshot.classificacao === "ALTO_RISCO" ? "ALTA" : "MEDIA",
      );
    }
  });

  it("marca como IGNORADA uma linha totalmente vazia", async () => {
    const { useCase } = buildHarness({
      rows: [
        {
          numeroLinha: 2,
          cnpj: null,
          razaoSocial: null,
          nomeFantasia: null,
          telefone: null,
          email: null,
          cidade: null,
          uf: null,
          responsavel: null,
        },
      ],
    });

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "empresas.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: null,
    });

    expect(resultado.contagens.ignoradas).toBe(1);
    expect(resultado.contagens.importadas).toBe(0);
  });

  it("marca como INVALIDA uma linha com CNPJ mal formado", async () => {
    const { useCase } = buildHarness({
      rows: [
        {
          numeroLinha: 2,
          cnpj: "00.000.000/0000-00",
          razaoSocial: "Empresa Com CNPJ Ruim LTDA",
          nomeFantasia: null,
          telefone: null,
          email: null,
          cidade: null,
          uf: null,
          responsavel: null,
        },
      ],
    });

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "empresas.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: null,
    });

    expect(resultado.contagens.invalidas).toBe(1);
    expect(resultado.contagens.importadas).toBe(0);
  });

  it("marca como INVALIDA uma linha sem Razão Social", async () => {
    const { useCase } = buildHarness({
      rows: [
        {
          numeroLinha: 2,
          cnpj: "11.222.333/0001-81",
          razaoSocial: null,
          nomeFantasia: null,
          telefone: null,
          email: null,
          cidade: null,
          uf: null,
          responsavel: null,
        },
      ],
    });

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "empresas.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: null,
    });

    expect(resultado.contagens.invalidas).toBe(1);
  });

  it("reaproveita a mesma Empresa (por CNPJ) se ela já existir, mas cria um novo Dossiê", async () => {
    const linha = {
      numeroLinha: 2,
      cnpj: "11.222.333/0001-81",
      razaoSocial: "Empresa Repetida LTDA",
      nomeFantasia: null,
      telefone: null,
      email: null,
      cidade: null,
      uf: null,
      responsavel: null,
    };
    const { useCase, empresaRepository, versionSnapshotRepository } = buildHarness({
      rows: [linha],
    });

    await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "primeira.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: null,
    });
    await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "segunda.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: null,
    });

    const empresas = await empresaRepository.findAll();
    expect(empresas).toHaveLength(1);

    const snapshots = await versionSnapshotRepository.findAll();
    expect(snapshots).toHaveLength(2);
  });

  it("continua processando as demais linhas quando uma falha (resiliência do lote)", async () => {
    const { useCase } = buildHarness({
      rows: [
        {
          numeroLinha: 2,
          cnpj: "00.000.000/0000-00",
          razaoSocial: "Linha Inválida LTDA",
          nomeFantasia: null,
          telefone: null,
          email: null,
          cidade: null,
          uf: null,
          responsavel: null,
        },
        {
          numeroLinha: 3,
          cnpj: "11.222.333/0001-81",
          razaoSocial: "Linha Válida LTDA",
          nomeFantasia: null,
          telefone: null,
          email: null,
          cidade: null,
          uf: null,
          responsavel: null,
        },
      ],
    });

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "empresas.xlsx",
      tenantId: TENANT_ID,
      iniciadoPorUsuarioId: null,
    });

    expect(resultado.totalLinhas).toBe(2);
    expect(resultado.contagens.invalidas).toBe(1);
    expect(resultado.contagens.importadas).toBe(1);
  });
});
