import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import type { ApiErrorResponse } from "@rip/shared-types";
import { AppError } from "../../../application/errors/AppError.js";
import type { ILogger } from "../../../application/ports/ILogger.js";
import type { Env } from "../../../shared/config/env.js";
import { mapAppErrorKindToStatusCode } from "../errors/http-status-map.js";

export function errorHandlerMiddleware(logger: ILogger, env: Env): ErrorRequestHandler {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? mapAppErrorKindToStatusCode(err.kind) : 500;
    const code = isAppError ? err.kind : "INTERNAL_ERROR";
    const message = isAppError ? err.message : "Erro interno inesperado";

    // AppError representa uma condição de negócio esperada (kind conhecido) —
    // registrar em "warn", não "error", para não misturar bloqueios/validações
    // esperadas com falhas de fato inesperadas nas métricas de erro.
    const logMethod = isAppError ? logger.warn.bind(logger) : logger.error.bind(logger);
    logMethod("http_error", {
      requestId: req.id,
      statusCode,
      code,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        requestId: req.id,
        ...(isAppError && err.details ? { details: err.details } : {}),
        ...(!isAppError && env.NODE_ENV !== "production" && err instanceof Error
          ? { details: { stack: err.stack } }
          : {}),
      },
    };

    res.status(statusCode).json(body);
  };
}
