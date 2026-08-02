import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forma padrão de estender os tipos do Express
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers["x-request-id"];
  req.id = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}
