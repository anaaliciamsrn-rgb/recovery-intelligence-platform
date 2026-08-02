import type { PrismaClient } from "@prisma/client";
import type { Router } from "express";
import { JwtTokenProvider } from "../../infrastructure/security/jwt-token-provider.js";
import type { Env } from "../../shared/config/env.js";
import { ClassificarDossieUseCase } from "../classification/application/use-cases/ClassificarDossieUseCase.js";
import type { IClassificationRule } from "../classification/application/ports/IClassificationRule.js";
import { PendenciaFiscalPgfnRule } from "../classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { PrismaDossieRepository } from "../dossie/infrastructure/persistence/PrismaDossieRepository.js";
import { createAuthenticateMiddleware } from "../identity/presentation/middlewares/authenticate.middleware.js";
import type { IRecommendationRule } from "./application/ports/IRecommendationRule.js";
import { GerarRecomendacoesUseCase } from "./application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "./infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "./infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "./infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "./infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "./infrastructure/rules/RecomendarWhatsappRule.js";
import { RecommendationController } from "./presentation/controllers/RecommendationController.js";
import { createRecommendationRouter } from "./presentation/routes/recommendation.routes.js";

export interface RecommendationModuleDependencies {
  prisma: PrismaClient;
  env: Env;
}

export interface RecommendationModule {
  recommendationRouter: Router;
}

/**
 * Composition root do módulo. Constrói sua própria instância de
 * `ClassificarDossieUseCase` (mesmas regras de `classification`, replicadas
 * aqui) em vez de receber a instância do outro módulo — mesmo padrão de
 * duplicação deliberada já usado em todo o projeto (ADRs 0010/0011/0013).
 * Ver ADR 0017.
 */
export function buildRecommendationModule(
  deps: RecommendationModuleDependencies,
): RecommendationModule {
  const { prisma, env } = deps;

  const tokenProvider = new JwtTokenProvider(env);
  const authenticate = createAuthenticateMiddleware(tokenProvider);

  const dossieRepository = new PrismaDossieRepository(prisma);
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
  const recommendationController = new RecommendationController(gerarRecomendacoesUseCase);
  const recommendationRouter = createRecommendationRouter({
    recommendationController,
    authenticate,
  });

  return { recommendationRouter };
}
