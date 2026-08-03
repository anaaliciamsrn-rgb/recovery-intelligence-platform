import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "../classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { CreateCaseUseCase } from "../case-management/application/use-cases/CreateCaseUseCase.js";
import { UpdateCaseDetailsUseCase } from "../case-management/application/use-cases/UpdateCaseDetailsUseCase.js";
import { CryptoIdGenerator as CaseCryptoIdGenerator } from "../case-management/infrastructure/CryptoIdGenerator.js";
import { PrismaCaseHistoryRepository } from "../case-management/infrastructure/persistence/PrismaCaseHistoryRepository.js";
import { PrismaCaseNoteRepository } from "../case-management/infrastructure/persistence/PrismaCaseNoteRepository.js";
import { PrismaCaseRepository } from "../case-management/infrastructure/persistence/PrismaCaseRepository.js";
import { SystemClock as CaseSystemClock } from "../case-management/infrastructure/SystemClock.js";
import { CreateDossieUseCase } from "../dossie/application/use-cases/CreateDossieUseCase.js";
import { RegistrarEvidenciaUseCase } from "../dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import { CryptoIdGenerator as DossieCryptoIdGenerator } from "../dossie/infrastructure/CryptoIdGenerator.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { SystemClock as DossieSystemClock } from "../dossie/infrastructure/SystemClock.js";
import { SnapshotBuilder } from "../dossier-versioning/application/services/SnapshotBuilder.js";
import { CreateVersionSnapshotUseCase } from "../dossier-versioning/application/use-cases/CreateVersionSnapshotUseCase.js";
import { CryptoIdGenerator as VersioningCryptoIdGenerator } from "../dossier-versioning/infrastructure/CryptoIdGenerator.js";
import { PrismaVersionSnapshotRepository } from "../dossier-versioning/infrastructure/persistence/PrismaVersionSnapshotRepository.js";
import { SystemClock as VersioningSystemClock } from "../dossier-versioning/infrastructure/SystemClock.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { ResolveIdentityUseCase } from "../identity-resolution/application/use-cases/ResolveIdentityUseCase.js";
import { PartialDocumentMatchStrategy } from "../identity-resolution/infrastructure/PartialDocumentMatchStrategy.js";
import { PartyByNameIdentitySourceProvider } from "../identity-resolution/infrastructure/PartyByNameIdentitySourceProvider.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaParticipacaoSocietariaRepository } from "../party/infrastructure/persistence/PrismaParticipacaoSocietariaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import { BuildPromptUseCase } from "../prompt-builder/application/use-cases/BuildPromptUseCase.js";
import type { IRecommendationRule } from "../recommendation/application/ports/IRecommendationRule.js";
import { GerarRecomendacoesUseCase } from "../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { RegisterTenantResourceUseCase } from "../tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { PrismaTenantRepository } from "../tenant/infrastructure/persistence/PrismaTenantRepository.js";
import { PrismaTenantResourceOwnershipRepository } from "../tenant/infrastructure/persistence/PrismaTenantResourceOwnershipRepository.js";
import { GenerateEmpresasDemoUseCase } from "./application/use-cases/GenerateEmpresasDemoUseCase.js";
import { GenerateEmpresasTemplateUseCase } from "./application/use-cases/GenerateEmpresasTemplateUseCase.js";
import { GetImportDashboardUseCase } from "./application/use-cases/GetImportDashboardUseCase.js";
import { GetImportReportUseCase } from "./application/use-cases/GetImportReportUseCase.js";
import { ImportEmpresasSpreadsheetUseCase } from "./application/use-cases/ImportEmpresasSpreadsheetUseCase.js";
import type { IEmpresaOwnershipSimulator } from "./application/ports/IEmpresaOwnershipSimulator.js";
import type { IReceitaFederalProvider } from "./application/ports/IReceitaFederalProvider.js";
import { BrasilApiReceitaFederalProvider } from "./infrastructure/BrasilApiReceitaFederalProvider.js";
import { SimulatedEmpresaOwnershipProvider } from "./infrastructure/SimulatedEmpresaOwnershipProvider.js";
import { ImportPgfnSpreadsheetUseCase } from "./application/use-cases/ImportPgfnSpreadsheetUseCase.js";
import { ListImportBatchesUseCase } from "./application/use-cases/ListImportBatchesUseCase.js";
import { PreviewImportSpreadsheetUseCase } from "./application/use-cases/PreviewImportSpreadsheetUseCase.js";
import { ResetTenantImportedDataUseCase } from "./application/use-cases/ResetTenantImportedDataUseCase.js";
import { ResolveImportRowIdentityUseCase } from "./application/use-cases/ResolveImportRowIdentityUseCase.js";
import { RollbackImportBatchUseCase } from "./application/use-cases/RollbackImportBatchUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaImportBatchRepository } from "./infrastructure/persistence/PrismaImportBatchRepository.js";
import { PrismaImportRowRepository } from "./infrastructure/persistence/PrismaImportRowRepository.js";
import { SimulatedEmpresaEvidenceProvider } from "./infrastructure/SimulatedEmpresaEvidenceProvider.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { XlsxEmpresaSpreadsheetTemplateProvider } from "./infrastructure/XlsxEmpresaSpreadsheetTemplateProvider.js";
import { XlsxEmpresasParser } from "./infrastructure/XlsxEmpresasParser.js";
import { XlsxPgfnParser } from "./infrastructure/XlsxPgfnParser.js";
import { ImportController } from "./presentation/controllers/ImportController.js";
import { ImportEmpresasController } from "./presentation/controllers/ImportEmpresasController.js";
import { createImportRouter } from "./presentation/routes/import.routes.js";

export interface ImportModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface ImportModule {
  importRouter: Router;
}

/**
 * Composition root do módulo. Reconstrói suas próprias instâncias de
 * `ClassificarDossieUseCase`/`GerarRecomendacoesUseCase`/
 * `CreateDossieUseCase`/`RegistrarEvidenciaUseCase`/`ResolveIdentityUseCase`
 * (mesmas regras/estratégias dos módulos originais, replicadas) em vez de
 * receber instâncias de outros módulos — mesmo padrão de duplicação
 * deliberada de todo o projeto (ADRs 0010/0011/0013/0016/0017/0018). A
 * resolução de identidade aqui usa `PartyByNameIdentitySourceProvider` +
 * `PartialDocumentMatchStrategy` (novos, ADR 0019) em vez de
 * `PartyIdentitySourceProvider` + `ExactDocumentMatchStrategy` — documento
 * mascarado nunca é igual a um completo.
 */
export function buildImportModule(deps: ImportModuleDependencies): ImportModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);
  const dossieRepository = new PrismaDossieRepository(prisma);
  const importBatchRepository = new PrismaImportBatchRepository(prisma);
  const importRowRepository = new PrismaImportRowRepository(prisma);

  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();
  const parser = new XlsxPgfnParser();

  const importPgfnSpreadsheetUseCase = new ImportPgfnSpreadsheetUseCase(
    parser,
    importBatchRepository,
    importRowRepository,
    idGenerator,
    clock,
  );

  const resolveIdentityUseCase = new ResolveIdentityUseCase(
    [new PartyByNameIdentitySourceProvider(pessoaRepository, empresaRepository)],
    new PartialDocumentMatchStrategy(),
  );
  const createDossieUseCase = new CreateDossieUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    new DossieCryptoIdGenerator(),
    new DossieSystemClock(),
  );
  const registrarEvidenciaUseCase = new RegistrarEvidenciaUseCase(
    dossieRepository,
    new DossieSystemClock(),
  );
  const resolveImportRowIdentityUseCase = new ResolveImportRowIdentityUseCase(
    importRowRepository,
    resolveIdentityUseCase,
    createDossieUseCase,
    registrarEvidenciaUseCase,
  );

  const classificationRules: IClassificationRule[] = [
    new PendenciaFiscalPgfnRule(),
    new ProcessoJudicialDataJudRule(),
    new SituacaoCadastralReceitaRule(),
  ];
  const classificarDossieUseCase = new ClassificarDossieUseCase(
    dossieRepository,
    classificationRules,
  );

  const recommendationRules: IRecommendationRule[] = [
    new RecomendarWhatsappRule(),
    new RecomendarCobrancaAmigavelRule(),
    new RecomendarLigacaoRule(),
    new RecomendarParcelamentoRule(),
    new RecomendarCobrancaJuridicaRule(),
  ];
  const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(
    classificarDossieUseCase,
    recommendationRules,
  );

  // Pipeline "Importar Empresas" (ADR 0037) — duplica a construção de
  // `CreateVersionSnapshotUseCase` (mesmas peças de `dossier-versioning`,
  // replicadas) porque é o mecanismo real que alimenta o dashboard
  // executivo (`analytics` lê de `VersionSnapshot`, nunca de `Dossie`
  // diretamente — ver ADR 0022/0025). Tenant nunca vem de header: sempre do
  // `req.auth.tenantId` resolvido por `identity` no login.
  const buildPromptUseCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );
  const versionSnapshotRepository = new PrismaVersionSnapshotRepository(prisma);
  const snapshotBuilder = new SnapshotBuilder(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
  );
  const createVersionSnapshotUseCase = new CreateVersionSnapshotUseCase(
    snapshotBuilder,
    versionSnapshotRepository,
    new VersioningCryptoIdGenerator(),
    new VersioningSystemClock(),
  );

  const tenantRepository = new PrismaTenantRepository(prisma);
  const tenantResourceOwnershipRepository = new PrismaTenantResourceOwnershipRepository(prisma);
  const registerTenantResourceUseCase = new RegisterTenantResourceUseCase(
    tenantRepository,
    tenantResourceOwnershipRepository,
    idGenerator,
    clock,
  );

  const participacaoRepository = new PrismaParticipacaoSocietariaRepository(prisma);
  const ownershipSimulator: IEmpresaOwnershipSimulator = new SimulatedEmpresaOwnershipProvider();
  const receitaFederalProvider: IReceitaFederalProvider = new BrasilApiReceitaFederalProvider();

  const caseRepository = new PrismaCaseRepository(prisma);
  const caseHistoryRepository = new PrismaCaseHistoryRepository(prisma);
  const caseNoteRepository = new PrismaCaseNoteRepository(prisma);
  const caseIdGenerator = new CaseCryptoIdGenerator();
  const caseClock = new CaseSystemClock();
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

  const importEmpresasSpreadsheetUseCase = new ImportEmpresasSpreadsheetUseCase(
    new XlsxEmpresasParser(),
    importBatchRepository,
    empresaRepository,
    createDossieUseCase,
    registrarEvidenciaUseCase,
    createVersionSnapshotUseCase,
    new SimulatedEmpresaEvidenceProvider(),
    registerTenantResourceUseCase,
    pessoaRepository,
    participacaoRepository,
    ownershipSimulator,
    createCaseUseCase,
    updateCaseDetailsUseCase,
    caseNoteRepository,
    receitaFederalProvider,
    idGenerator,
    clock,
  );
  const empresaSpreadsheetTemplateProvider = new XlsxEmpresaSpreadsheetTemplateProvider();
  const generateEmpresasTemplateUseCase = new GenerateEmpresasTemplateUseCase(
    empresaSpreadsheetTemplateProvider,
  );
  const generateEmpresasDemoUseCase = new GenerateEmpresasDemoUseCase(
    empresaSpreadsheetTemplateProvider,
  );
  const resetTenantImportedDataUseCase = new ResetTenantImportedDataUseCase(
    dossieRepository,
    versionSnapshotRepository,
    importBatchRepository,
    tenantResourceOwnershipRepository,
  );
  const importEmpresasController = new ImportEmpresasController(
    importEmpresasSpreadsheetUseCase,
    generateEmpresasTemplateUseCase,
    generateEmpresasDemoUseCase,
    resetTenantImportedDataUseCase,
  );

  const getImportDashboardUseCase = new GetImportDashboardUseCase(
    importBatchRepository,
    importRowRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );
  const getImportReportUseCase = new GetImportReportUseCase(
    importBatchRepository,
    importRowRepository,
  );
  const previewImportSpreadsheetUseCase = new PreviewImportSpreadsheetUseCase(
    parser,
    importRowRepository,
  );
  const rollbackImportBatchUseCase = new RollbackImportBatchUseCase(importBatchRepository, clock);
  const listImportBatchesUseCase = new ListImportBatchesUseCase(
    importBatchRepository,
    tenantResourceOwnershipRepository,
  );

  const importController = new ImportController(
    importPgfnSpreadsheetUseCase,
    resolveImportRowIdentityUseCase,
    getImportDashboardUseCase,
    getImportReportUseCase,
    previewImportSpreadsheetUseCase,
    rollbackImportBatchUseCase,
    listImportBatchesUseCase,
    registerTenantResourceUseCase,
  );
  const importRouter = createImportRouter({
    importController,
    importEmpresasController,
    authenticate,
  });

  return { importRouter };
}
