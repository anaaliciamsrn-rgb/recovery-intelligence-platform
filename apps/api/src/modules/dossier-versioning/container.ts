import type { PrismaClient } from "@prisma/client";
import type { RequestHandler, Router } from "express";
import type { ILogger } from "../../application/ports/ILogger.js";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "../classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import { PrismaEmpresaRepository } from "../party/infrastructure/persistence/PrismaEmpresaRepository.js";
import { PrismaPessoaRepository } from "../party/infrastructure/persistence/PrismaPessoaRepository.js";
import { BuildPromptUseCase } from "../prompt-builder/application/use-cases/BuildPromptUseCase.js";
import type { IRecommendationRule } from "../recommendation/application/ports/IRecommendationRule.js";
import { GerarRecomendacoesUseCase } from "../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { SnapshotBuilder } from "./application/services/SnapshotBuilder.js";
import { CreateVersionSnapshotUseCase } from "./application/use-cases/CreateVersionSnapshotUseCase.js";
import { DiffDossieVersionsUseCase } from "./application/use-cases/DiffDossieVersionsUseCase.js";
import { GetDossieVersionUseCase } from "./application/use-cases/GetDossieVersionUseCase.js";
import { ListDossieVersionsUseCase } from "./application/use-cases/ListDossieVersionsUseCase.js";
import { CryptoIdGenerator } from "./infrastructure/CryptoIdGenerator.js";
import { PrismaVersionSnapshotRepository } from "./infrastructure/persistence/PrismaVersionSnapshotRepository.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { DossierVersioningController } from "./presentation/controllers/DossierVersioningController.js";
import { createVersionSnapshotMiddleware } from "./presentation/middlewares/versionSnapshot.middleware.js";
import { createDossierVersioningRouter } from "./presentation/routes/dossier-versioning.routes.js";

export interface DossierVersioningModuleDependencies {
  prisma: PrismaClient;
  env: Env;
  logger: ILogger;
}

export interface DossierVersioningModule {
  dossierVersioningRouter: Router;
  /** Middleware global — deve ser montado com `app.use(...)` antes das rotas de negócio, para observá-las. */
  versionSnapshotMiddleware: RequestHandler;
}

/**
 * Composition root do módulo. Reconstrói suas próprias instâncias de
 * `ClassificarDossieUseCase`/`GerarRecomendacoesUseCase`/`BuildPromptUseCase`
 * (mesmas regras/lógica dos módulos originais, replicadas) — mesmo padrão
 * de duplicação deliberada de todo o projeto (ADRs 0010/0011/0013/
 * 0016/0017/0018/0019/0020/0021). `versionSnapshotMiddleware` é o único
 * ponto de contato deste módulo com `dossie` — só observa requisição/
 * resposta já prontas, nunca chama nenhum use case daquele módulo. Ver ADR
 * 0022.
 */
export function buildDossierVersioningModule(
  deps: DossierVersioningModuleDependencies,
): DossierVersioningModule {
  const { prisma, env, logger } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);
  const versionSnapshotRepository = new PrismaVersionSnapshotRepository(prisma);

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

  const buildPromptUseCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );

  const idGenerator = new CryptoIdGenerator();
  const clock = new SystemClock();
  const snapshotBuilder = new SnapshotBuilder(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
  );

  const createVersionSnapshotUseCase = new CreateVersionSnapshotUseCase(
    snapshotBuilder,
    versionSnapshotRepository,
    idGenerator,
    clock,
  );
  const listDossieVersionsUseCase = new ListDossieVersionsUseCase(
    dossieRepository,
    versionSnapshotRepository,
  );
  const getDossieVersionUseCase = new GetDossieVersionUseCase(versionSnapshotRepository);
  const diffDossieVersionsUseCase = new DiffDossieVersionsUseCase(versionSnapshotRepository);

  const dossierVersioningController = new DossierVersioningController(
    listDossieVersionsUseCase,
    getDossieVersionUseCase,
    diffDossieVersionsUseCase,
  );
  const dossierVersioningRouter = createDossierVersioningRouter({
    dossierVersioningController,
    authenticate,
  });
  const versionSnapshotMiddleware = createVersionSnapshotMiddleware(
    createVersionSnapshotUseCase,
    logger,
  );

  return { dossierVersioningRouter, versionSnapshotMiddleware };
}
