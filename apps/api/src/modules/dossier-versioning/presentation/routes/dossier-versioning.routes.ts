import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { DossierVersioningController } from "../controllers/DossierVersioningController.js";

export interface DossierVersioningRoutesDependencies {
  dossierVersioningController: DossierVersioningController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/dossiers` — nome em inglês, de propósito distinto de `/api/v1/dossies` (ver modules/dossier-versioning/container.ts e ADR 0022). */
export function createDossierVersioningRouter(deps: DossierVersioningRoutesDependencies): Router {
  const router = Router();
  const controller = deps.dossierVersioningController;

  router.get("/:id/history", deps.authenticate, asyncHandler(controller.history));
  router.get("/:id/history/:version", deps.authenticate, asyncHandler(controller.historyByVersion));
  router.get("/:id/diff/:v1/:v2", deps.authenticate, asyncHandler(controller.diff));

  return router;
}
