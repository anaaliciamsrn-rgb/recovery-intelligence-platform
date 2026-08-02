import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../application/errors/AppError.js";

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("NOT_FOUND", `Rota ${req.method} ${req.originalUrl} não encontrada`));
}
