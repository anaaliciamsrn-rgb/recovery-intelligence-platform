import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "../classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { CreateDossieUseCase } from "../dossie/application/use-cases/CreateDossieUseCase.js";
import { RegistrarEvidenciaUseCase } from "../dossie/application/use-cases/RegistrarEvidenciaUseCase.js";
import { CryptoIdGenerator as DossieCryptoIdGenerator } from "../dossie/infrastructure/CryptoIdGenerator.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { SystemClock as DossieSystemClock } from "../dossie/infrastructure/SystemClock.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { ResolveIdentityUseCase } from "../identity-resolution/application/use-cases/ResolveIdentityUseCase.js";
import { PartialDocumentMatchStrategy } from "../identity-resolution/infrastructure/PartialDocumentMatchStrategy.js";
import { PartyByNameIdentitySourceProvider } from "../identity-resolution/infrastructure/PartyByNameIdentitySourceProvider.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import type { IRecommendationRule } from "../recommendation/application/ports/IRecommendationRule.js";
import { GerarRecomendacoesUseCase } from "../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { GetImportDashboardUseCase } from "./application/use-cases/GetImportDashboardUseCase.js";
import { GetImportReportUseCase } from "./application/use-cases/GetImportReportUseCase.js";
import { ImportPgfnSpreadsheetUseCase } from "./application/use-cases/ImportPgfnSpreadsheetUseCase.js";
import { ListImportBatchesUseCase } from "./application/use-cases/ListImportBatchesUseCase.js";
import { PreviewImportSpreadsheetUseCase } from "./application/use-cases/PreviewImportSpreadsheetUseCase.js";
import { ResolveImportRowIdentityUseCase } from "./application/use-cases/ResolveImportRowIdentityUseCase.js";
import { RollbackImportBatchUseCase } from "./application/use-cases/RollbackImportBatchUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaImportBatchRepository } from "./infrastructure/persistence/PrismaImportBatchRepository.js";
import { PrismaImportRowRepository } from "./infrastructure/persistence/PrismaImportRowRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { XlsxPgfnParser } from "./infrastructure/XlsxPgfnParser.js";
import { ImportController } from "./presentation/controllers/ImportController.js";
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
  const listImportBatchesUseCase = new ListImportBatchesUseCase(importBatchRepository);

  const importController = new ImportController(
    importPgfnSpreadsheetUseCase,
    resolveImportRowIdentityUseCase,
    getImportDashboardUseCase,
    getImportReportUseCase,
    previewImportSpreadsheetUseCase,
    rollbackImportBatchUseCase,
    listImportBatchesUseCase,
  );
  const importRouter = createImportRouter({ importController, authenticate });

  return { importRouter };
}
