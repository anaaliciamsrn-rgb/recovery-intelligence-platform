import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { ConfidenceHeatmapController } from "../controllers/ConfidenceHeatmapController.js";

export interface ConfidenceHeatmapRoutesDependencies {
  confidenceHeatmapController: ConfidenceHeatmapController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
}

/** Montado em `/api/v1/confidence-heatmap` (ver modules/confidence-heatmap/container.ts). RBAC: ver ADR 0029. */
export function createConfidenceHeatmapRouter(deps: ConfidenceHeatmapRoutesDependencies): Router {
  const router = Router();

  router.get(
    "/:dossieId",
    deps.authenticate,
    deps.authorizeRead,
    asyncHandler(deps.confidenceHeatmapController.get),
  );

  return router;
}
