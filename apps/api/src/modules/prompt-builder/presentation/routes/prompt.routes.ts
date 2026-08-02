import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { PromptController } from "../controllers/PromptController.js";

export interface PromptRoutesDependencies {
  promptController: PromptController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/prompts` (ver modules/prompt-builder/container.ts). */
export function createPromptRouter(deps: PromptRoutesDependencies): Router {
  const router = Router();

  router.get("/:dossieId", deps.authenticate, asyncHandler(deps.promptController.build));

  return router;
}
