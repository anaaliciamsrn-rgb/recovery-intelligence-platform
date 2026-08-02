import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import { TenantPolicy } from "../../domain/services/TenantPolicy.js";
import type { ITenantResourceOwnershipRepository } from "../../domain/repositories/ITenantResourceOwnershipRepository.js";

/**
 * Factory de middleware que exige `req.tenantId` (já resolvido por
 * `resolveTenantMiddleware`) e verifica, via `TenantPolicy`, se aquele
 * tenant é o proprietário do recurso identificado por `extractResourceId`.
 * Disponível para qualquer rota nova adotar — nenhuma rota existente foi
 * alterada para usá-lo (ver ADR 0028, sobre o motivo de não retroagir
 * sobre módulos já aprovados).
 */
export function createRequireTenantAccessMiddleware(
  tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  resourceType: string,
  extractResourceId: (req: Request) => string,
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenantId) {
      next(new AppError("FORBIDDEN", "Tenant não identificado para esta requisição"));
      return;
    }

    const resourceId = extractResourceId(req);
    tenantResourceOwnershipRepository
      .findByResource(resourceType, resourceId)
      .then((ownership) => {
        if (!TenantPolicy.podeAcessar(ownership, req.tenantId!)) {
          next(new AppError("FORBIDDEN", `Tenant não tem acesso a ${resourceType}:${resourceId}`));
          return;
        }
        next();
      })
      .catch(next);
  };
}
