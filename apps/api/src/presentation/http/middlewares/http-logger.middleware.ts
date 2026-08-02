import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ILogger } from "../../../application/ports/ILogger.js";

export function httpLoggerMiddleware(logger: ILogger): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      logger.info("http_request", {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs),
      });
    });

    next();
  };
}
