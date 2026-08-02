import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { AnalyticsController } from "../controllers/AnalyticsController.js";

export interface AnalyticsRoutesDependencies {
  analyticsController: AnalyticsController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
}

/** Montado em `/api/v1/analytics` (ver modules/analytics/container.ts). RBAC: ver ADR 0029. */
export function createAnalyticsRouter(deps: AnalyticsRoutesDependencies): Router {
  const router = Router();

  router.get(
    "/summary",
    deps.authenticate,
    deps.authorizeRead,
    asyncHandler(deps.analyticsController.summary),
  );

  return router;
}
