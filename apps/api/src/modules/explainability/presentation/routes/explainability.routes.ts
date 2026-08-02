import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { ExplainabilityController } from "../controllers/ExplainabilityController.js";

export interface ExplainabilityRoutesDependencies {
  explainabilityController: ExplainabilityController;
  authenticate: RequestHandler;
}

/**
 * Montado em `/api/v1/classification` (ver modules/explainability/container.ts).
 * `:id` é o `dossieId` — a classificação em si nunca é persistida com
 * identidade própria (ADR 0016), então o Dossiê é o único identificador
 * estável para "a classificação de quem".
 */
export function createExplainabilityRouter(deps: ExplainabilityRoutesDependencies): Router {
  const router = Router();

  router.get(
    "/:id/explanation",
    deps.authenticate,
    asyncHandler(deps.explainabilityController.obterExplicacao),
  );

  return router;
}
