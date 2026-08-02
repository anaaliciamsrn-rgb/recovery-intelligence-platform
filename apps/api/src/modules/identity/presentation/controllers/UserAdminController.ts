import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { AssignUserRolesUseCase } from "../../application/use-cases/AssignUserRolesUseCase.js";
import type { ListUsersUseCase } from "../../application/use-cases/ListUsersUseCase.js";
import { assignUserRolesRequestSchema } from "../validators/auth.validators.js";

/** Gestão de usuários — montado com `authorize(Permission.MANAGE_USERS)` em auth.routes.ts, nunca exposto sem essa checagem. */
export class UserAdminController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly assignUserRolesUseCase: AssignUserRolesUseCase,
  ) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    const users = await this.listUsersUseCase.execute();
    res.status(200).json({ items: users });
  };

  assignRoles = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const body = parseRequestBody(assignUserRolesRequestSchema, req.body);

    await this.assignUserRolesUseCase.execute({
      targetUserId: req.params.id ?? "",
      roles: body.roles,
      actorUserId: req.auth.userId,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(204).send();
  };
}
