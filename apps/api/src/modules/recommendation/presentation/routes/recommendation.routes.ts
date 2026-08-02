import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { RecommendationController } from "../controllers/RecommendationController.js";

export interface RecommendationRoutesDependencies {
  recommendationController: RecommendationController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/recomendacoes` (ver modules/recommendation/container.ts). */
export function createRecommendationRouter(deps: RecommendationRoutesDependencies): Router {
  const router = Router();

  router.get("/:dossieId", deps.authenticate, asyncHandler(deps.recommendationController.gerar));

  return router;
}
