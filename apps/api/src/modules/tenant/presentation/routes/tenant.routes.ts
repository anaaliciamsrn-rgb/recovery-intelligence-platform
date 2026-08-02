import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { TenantController } from "../controllers/TenantController.js";

export interface TenantRoutesDependencies {
  tenantController: TenantController;
  authenticate: RequestHandler;
  authorizeManage: RequestHandler;
}

/** Montado em `/api/v1/tenants` (ver modules/tenant/container.ts). RBAC: ver ADR 0029 — toda operação de tenant é tratada como gestão administrativa. */
export function createTenantRouter(deps: TenantRoutesDependencies): Router {
  const router = Router();
  const controller = deps.tenantController;

  router.post("/", deps.authenticate, deps.authorizeManage, asyncHandler(controller.create));
  router.get("/", deps.authenticate, deps.authorizeManage, asyncHandler(controller.list));
  router.get("/:id", deps.authenticate, deps.authorizeManage, asyncHandler(controller.getById));
  router.post(
    "/:id/resources",
    deps.authenticate,
    deps.authorizeManage,
    asyncHandler(controller.registerResource),
  );
  router.get(
    "/:id/resources/:resourceType/:resourceId/access",
    deps.authenticate,
    deps.authorizeManage,
    asyncHandler(controller.checkAccess),
  );

  return router;
}
