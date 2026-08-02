import { Router, type RequestHandler } from "express";
import multer from "multer";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { ImportController } from "../controllers/ImportController.js";

export interface ImportRoutesDependencies {
  importController: ImportController;
  authenticate: RequestHandler;
}

/** Limite defensivo contra upload abusivo — bem acima do tamanho real esperado de um export da PGFN (dezenas de KB). */
const TAMANHO_MAXIMO_ARQUIVO_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO_BYTES },
});

/** Montado em `/api/v1/imports` (ver modules/import/container.ts). */
export function createImportRouter(deps: ImportRoutesDependencies): Router {
  const router = Router();

  router.post(
    "/",
    deps.authenticate,
    upload.single("file"),
    asyncHandler(deps.importController.importar),
  );
  router.get("/", deps.authenticate, asyncHandler(deps.importController.list));
  router.post(
    "/preview",
    deps.authenticate,
    upload.single("file"),
    asyncHandler(deps.importController.preview),
  );
  router.get("/:id/dashboard", deps.authenticate, asyncHandler(deps.importController.dashboard));
  router.get("/:id/relatorio", deps.authenticate, asyncHandler(deps.importController.relatorio));
  router.post("/:id/rollback", deps.authenticate, asyncHandler(deps.importController.rollback));

  return router;
}
