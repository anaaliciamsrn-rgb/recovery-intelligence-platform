import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { AuditController } from "../controllers/AuditController.js";

export interface AuditRoutesDependencies {
  auditController: AuditController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/audit` (ver modules/audit-trail/container.ts). */
export function createAuditRouter(deps: AuditRoutesDependencies): Router {
  const router = Router();
  const controller = deps.auditController;

  router.get("/", deps.authenticate, asyncHandler(controller.list));
  router.get("/entity/:entity/:id", deps.authenticate, asyncHandler(controller.listByEntity));
  router.get("/user/:userId", deps.authenticate, asyncHandler(controller.listByUser));
  router.get("/request/:requestId", deps.authenticate, asyncHandler(controller.listByRequestId));
  router.get("/:id", deps.authenticate, asyncHandler(controller.getById));

  return router;
}
