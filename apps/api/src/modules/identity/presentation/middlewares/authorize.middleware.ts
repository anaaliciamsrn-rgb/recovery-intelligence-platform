import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import { RolePermissionPolicy } from "../../domain/services/RolePermissionPolicy.js";
import type { Permission } from "../../domain/value-objects/Permission.js";
import type { Role } from "../../domain/value-objects/Role.js";

/**
 * Checagem estática de permissão por rota (deny-by-default). Só cobre o
 * caso "papel X pode fazer Y" — autorização composta (ex.: "dono do
 * recurso OU permissão de admin") fica dentro do use case, ver
 * RevokeSessionUseCase.
 */
export function createAuthorizeMiddleware(requiredPermission: Permission): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError("UNAUTHORIZED", "Não autenticado"));
      return;
    }

    const hasPermission = RolePermissionPolicy.hasPermission(
      req.auth.roles as Role[],
      requiredPermission,
    );

    if (!hasPermission) {
      next(new AppError("FORBIDDEN", "Permissão insuficiente"));
      return;
    }

    next();
  };
}
