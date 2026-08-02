import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ILogger } from "../../../../application/ports/ILogger.js";
import type { RecordAuditEventUseCase } from "../../application/use-cases/RecordAuditEventUseCase.js";
import { findAuditableRoute } from "./auditableRoutes.js";

const MENSAGEM_FALHA_PADRAO = "Falha ao processar a requisição";

function extrairMensagemDeErro(responseBody: unknown): string | null {
  if (responseBody === null || typeof responseBody !== "object") return null;
  const error = (responseBody as { error?: unknown }).error;
  if (error === null || typeof error !== "object") return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

/**
 * Observa a fronteira HTTP e grava um evento de auditoria para as rotas
 * registradas em `AUDITABLE_ROUTES` — nunca altera a resposta enviada ao
 * cliente (só lê o corpo já produzido pelo controller real, via
 * monkey-patch de `res.json`/`res.send`, técnica padrão de middlewares de
 * logging como o `morgan`/`express-winston`). Uma falha ao gravar o evento
 * de auditoria nunca deve derrubar a requisição real — é só registrada via
 * `logger`. Mesma técnica de captura de duração de `httpLoggerMiddleware`
 * (hrtime). Ver ADR 0021.
 *
 * Rotas fora de `AUDITABLE_ROUTES` não geram nenhum evento — este módulo
 * audita "ações relevantes" (a lista fechada da Etapa 2), não todo request.
 */
export function createAuditTrailMiddleware(
  recordAuditEventUseCase: RecordAuditEventUseCase,
  logger: ILogger,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();
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

      const route = findAuditableRoute(req.method, `${req.baseUrl}${routePath}`);
      if (!route) return;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const ctx = { req, responseBody };
      const sucesso = res.statusCode < 400;

      recordAuditEventUseCase
        .execute({
          usuarioId: route.extractUsuarioId(ctx),
          entidade: route.entidade,
          entidadeId: route.extractEntidadeId(ctx),
          tipo: route.tipo,
          payload: route.extractPayload(ctx),
          requestId: req.id,
          ip: req.ip ?? null,
          userAgent: req.headers["user-agent"] ?? null,
          duracaoMs: Math.round(durationMs),
          outcome: sucesso ? "SUCESSO" : "FALHA",
          mensagem: sucesso
            ? `${route.tipo} concluído com sucesso`
            : (extrairMensagemDeErro(responseBody) ?? MENSAGEM_FALHA_PADRAO),
        })
        .catch((error: unknown) => {
          logger.error("audit_event_record_failed", {
            requestId: req.id,
            tipo: route.tipo,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });

    next();
  };
}
