import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { FeatureFlagController } from "../controllers/FeatureFlagController.js";

export interface FeatureFlagRoutesDependencies {
  featureFlagController: FeatureFlagController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
  authorizeWrite: RequestHandler;
}

/** Montado em `/api/v1/feature-flags` (ver modules/feature-flags/container.ts). RBAC: ver ADR 0029/0031. */
export function createFeatureFlagRouter(deps: FeatureFlagRoutesDependencies): Router {
  const router = Router();
  const controller = deps.featureFlagController;

  router.post("/", deps.authenticate, deps.authorizeWrite, asyncHandler(controller.create));
  router.get("/", deps.authenticate, deps.authorizeRead, asyncHandler(controller.list));
  router.get("/:chave", deps.authenticate, deps.authorizeRead, asyncHandler(controller.getByChave));
  router.patch("/:chave", deps.authenticate, deps.authorizeWrite, asyncHandler(controller.update));
  router.get(
    "/:chave/evaluate",
    deps.authenticate,
    deps.authorizeRead,
    asyncHandler(controller.evaluate),
  );
  router.put(
    "/:chave/overrides",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.setOverride),
  );
  router.delete(
    "/:chave/overrides/:escopoTipo/:escopoValor",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.removeOverride),
  );

  return router;
}
