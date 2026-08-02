import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { CaseController } from "../controllers/CaseController.js";

export interface CaseRoutesDependencies {
  caseController: CaseController;
  authenticate: RequestHandler;
  authorizeRead: RequestHandler;
  authorizeWrite: RequestHandler;
}

/** Montado em `/api/v1/cases` (ver modules/case-management/container.ts). RBAC: ver ADR 0029. */
export function createCaseRouter(deps: CaseRoutesDependencies): Router {
  const router = Router();
  const controller = deps.caseController;

  router.post("/", deps.authenticate, deps.authorizeWrite, asyncHandler(controller.create));
  router.get("/", deps.authenticate, deps.authorizeRead, asyncHandler(controller.list));
  router.get("/:id", deps.authenticate, deps.authorizeRead, asyncHandler(controller.getById));
  router.patch(
    "/:id/status",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.updateStatus),
  );
  router.patch(
    "/:id",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.updateDetails),
  );
  router.post(
    "/:id/notes",
    deps.authenticate,
    deps.authorizeWrite,
    asyncHandler(controller.addNote),
  );

  return router;
}
