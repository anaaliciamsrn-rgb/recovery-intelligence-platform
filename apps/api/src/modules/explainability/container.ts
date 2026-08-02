import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
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
import { GetClassificationExplanationUseCase } from "./application/use-cases/GetClassificationExplanationUseCase.js";
import { SystemClock } from "./infrastructure/SystemClock.js";
import { ExplainabilityController } from "./presentation/controllers/ExplainabilityController.js";
import { createExplainabilityRouter } from "./presentation/routes/explainability.routes.js";

export interface ExplainabilityModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface ExplainabilityModule {
  explainabilityRouter: Router;
}

/**
 * Composition root do módulo. Reconstrói suas próprias instâncias de
 * `ClassificarDossieUseCase`/`GerarRecomendacoesUseCase`/`BuildPromptUseCase`
 * (mesmas regras/lógica dos módulos originais, replicadas) em vez de
 * receber instâncias de outros módulos — mesmo padrão de duplicação
 * deliberada de todo o projeto (ADRs 0010/0011/0013/0016/0017/0018/0019).
 * Ver ADR 0020.
 */
export function buildExplainabilityModule(
  deps: ExplainabilityModuleDependencies,
): ExplainabilityModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const dossieRepository = new PrismaDossieRepository(prisma);
  const pessoaRepository = new PrismaPessoaRepository(prisma);
  const empresaRepository = new PrismaEmpresaRepository(prisma);

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

  const clock = new SystemClock();
  const getClassificationExplanationUseCase = new GetClassificationExplanationUseCase(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
    clock,
  );

  const explainabilityController = new ExplainabilityController(
    getClassificationExplanationUseCase,
  );
  const explainabilityRouter = createExplainabilityRouter({
    explainabilityController,
    authenticate,
  });

  return { explainabilityRouter };
}
