import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- mesmo padrão de `req.auth` (identity) e `req.id` (request-id.middleware)
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

const TENANT_HEADER = "x-tenant-id";

/**
 * Resolve o tenant do cabeçalho `X-Tenant-Id`, se presente — nunca bloqueia
 * a requisição: se o header estiver ausente, ou apontar para um tenant
 * inexistente/inativo, `req.tenantId` simplesmente não é definido. É uma
 * fundação disponível para rotas futuras decidirem exigir tenant via
 * `requireTenantAccessMiddleware`; nenhuma rota existente foi alterada
 * para exigi-lo. Ver ADR 0028.
 *
 * Resolução via header (não via claim do JWT) é uma decisão deliberada
 * desta etapa: colocar `tenantId` no token exigiria alterar `identity`
 * (módulo aprovado), fora do escopo aditivo desta etapa.
 */
export function createResolveTenantMiddleware(tenantRepository: ITenantRepository): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers[TENANT_HEADER];
    const tenantId = typeof header === "string" ? header : undefined;

    if (!tenantId) {
      next();
      return;
    }

    tenantRepository
      .findById(tenantId)
      .then((tenant) => {
        if (tenant && tenant.ativo) {
          req.tenantId = tenant.id;
        }
        next();
      })
      .catch(next);
  };
}
