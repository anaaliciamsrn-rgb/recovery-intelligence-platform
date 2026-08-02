import { Router, type RequestHandler } from "express";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { IdentityResolutionController } from "../controllers/IdentityResolutionController.js";

export interface IdentityResolutionRoutesDependencies {
  identityResolutionController: IdentityResolutionController;
  authenticate: RequestHandler;
}

/** Montado em `/api/v1/identity-resolution` (ver modules/identity-resolution/container.ts). */
export function createIdentityResolutionRouter(deps: IdentityResolutionRoutesDependencies): Router {
  const router = Router();

  router.post(
    "/resolve",
    deps.authenticate,
    asyncHandler(deps.identityResolutionController.resolve),
  );

  return router;
}
