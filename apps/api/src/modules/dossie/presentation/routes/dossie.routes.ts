import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { DossieController } from "../controllers/DossieController.js";

export interface DossieRoutesDependencies {
  dossieController: DossieController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/dossies` (ver modules/dossie/container.ts). */
export function createDossieRouter(deps: DossieRoutesDependencies): Router {
  const router = Router();

  router.post("/", deps.authenticate, asyncHandler(deps.dossieController.create));
  router.get("/:id", deps.authenticate, asyncHandler(deps.dossieController.getById));
  router.post(
    "/:id/evidencias",
    deps.authenticate,
    asyncHandler(deps.dossieController.registrarEvidencia),
  );

  return router;
}
