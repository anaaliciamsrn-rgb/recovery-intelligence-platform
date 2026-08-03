import { Router, type RequestHandler } from "express";
import multer from "multer";
import { asyncHandler } from "../../../../shared/async-handler.js";
import type { ImportController } from "../controllers/ImportController.js";
import type { ImportEmpresasController } from "../controllers/ImportEmpresasController.js";

export interface ImportRoutesDependencies {
  importController: ImportController;
  importEmpresasController: ImportEmpresasController;
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

  // Fluxo "Importar Empresas" (ADR 0037) — pipeline de negócio distinto do
  // PGFN acima, mesmo módulo. Rotas literais ("empresas/modelo",
  // "empresas/demo") não colidem com "/:id/dashboard"/"/:id/relatorio" por
  // terem um segmento literal diferente na mesma posição.
  router.post(
    "/empresas",
    deps.authenticate,
    upload.single("file"),
    asyncHandler(deps.importEmpresasController.importar),
  );
  router.get("/empresas/modelo", deps.authenticate, deps.importEmpresasController.modelo);
  router.get("/empresas/demo", deps.authenticate, deps.importEmpresasController.demo);
  router.delete(
    "/empresas",
    deps.authenticate,
    asyncHandler(deps.importEmpresasController.resetar),
  );
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
