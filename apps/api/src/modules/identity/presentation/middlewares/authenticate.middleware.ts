import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { ITokenProvider } from "../../../../application/ports/ITokenProvider.js";

export interface AuthContext {
  userId: string;
  sessionId: string;
  roles: string[];
  tenantId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- forma padrão de estender os tipos do Express
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const BEARER_PREFIX = "Bearer ";

/** Extrai e verifica o access token; popula `req.auth`. Não sabe nada sobre RBAC — isso é `authorizeMiddleware`. */
export function createAuthenticateMiddleware(tokenProvider: ITokenProvider): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;

    if (!header || !header.startsWith(BEARER_PREFIX)) {
      next(new AppError("UNAUTHORIZED", "Token de acesso ausente"));
      return;
    }

    const token = header.slice(BEARER_PREFIX.length);

    try {
      const claims = tokenProvider.verifyAccessToken(token);
      req.auth = {
        userId: claims.sub,
        sessionId: claims.sid,
        roles: claims.roles,
        tenantId: claims.tenantId,
      };
      next();
    } catch {
      next(new AppError("UNAUTHORIZED", "Token de acesso inválido ou expirado"));
    }
  };
}
