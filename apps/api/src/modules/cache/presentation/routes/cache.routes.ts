import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { CacheController } from "../controllers/CacheController.js";

export interface CacheRoutesDependencies {
  cacheController: CacheController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
  authorizeWrite: RequestHandler;
}

/** Montado em `/api/v1/cache` (ver modules/cache/container.ts). RBAC: ver ADR 0029/0033. */
export function createCacheRouter(deps: CacheRoutesDependencies): Router {
  const router = Router();
  const controller = deps.cacheController;

  router.put(
    "/entries/:namespace",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.set),
  );
  router.get(
    "/entries/:namespace",
    deps.authenticate,
    deps.authorizeRead,
    asyncHandler(controller.get),
  );
  router.delete(
    "/entries/:namespace",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.invalidate),
  );
  router.get(
    "/stats/:namespace",
    deps.authenticate,
    deps.authorizeRead,
    asyncHandler(controller.stats),
  );

  return router;
}
