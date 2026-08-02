import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ILogger } from "../../../../application/ports/ILogger.js";
import type { CreateVersionSnapshotUseCase } from "../../application/use-cases/CreateVersionSnapshotUseCase.js";
import { findVersionableRoute } from "./versionableRoutes.js";

/**
 * Observa a fronteira HTTP e cria uma nova versão do Dossiê para as rotas
 * registradas em `VERSIONABLE_ROUTES` — mesma técnica de
 * `auditTrail.middleware.ts` (ADR 0021): monkey-patch de
 * `res.json`/`res.send` para capturar a resposta já produzida pelo
 * controller real, sem alterá-la. Nunca chama nenhum use case dos módulos
 * observados (`dossie`) — só lê o que a requisição/resposta já produziram
 * por conta própria. Uma falha ao criar a versão nunca derruba a
 * requisição real, só é logada. Ver ADR 0022.
 */
export function createVersionSnapshotMiddleware(
  createVersionSnapshotUseCase: CreateVersionSnapshotUseCase,
  logger: ILogger,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let responseBody: unknown = null;

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as Response["json"];

    const originalSend = res.send.bind(res);
    res.send = ((body: unknown) => {
      if (responseBody === null) responseBody = body;
      return originalSend(body);
    }) as Response["send"];

    res.on("finish", () => {
      const routePath = req.route?.path as string | undefined;
      if (!routePath) return;

      const route = findVersionableRoute(req.method, `${req.baseUrl}${routePath}`);
      if (!route) return;

      const sucesso = res.statusCode < 400;
      if (!sucesso) return;

      const dossieId = route.extractDossieId({ req, responseBody });
      if (!dossieId) return;

      createVersionSnapshotUseCase
        .execute({ dossieId, usuarioId: req.auth?.userId ?? null })
        .catch((error: unknown) => {
          logger.error("version_snapshot_creation_failed", {
            requestId: req.id,
            dossieId,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });

    next();
  };
}
