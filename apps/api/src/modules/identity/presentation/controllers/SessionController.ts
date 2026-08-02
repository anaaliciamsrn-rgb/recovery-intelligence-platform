import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { ListActiveSessionsUseCase } from "../../application/use-cases/ListActiveSessionsUseCase.js";
import type { RevokeSessionUseCase } from "../../application/use-cases/RevokeSessionUseCase.js";
import type { Role } from "../../domain/value-objects/Role.js";

export class SessionController {
  constructor(
    private readonly listActiveSessionsUseCase: ListActiveSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const sessions = await this.listActiveSessionsUseCase.execute(req.auth.userId);
    res.status(200).json({ sessions });
  };

  revoke = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    await this.revokeSessionUseCase.execute({
      sessionId: req.params.sessionId ?? "",
      requestingUserId: req.auth.userId,
      requestingUserRoles: req.auth.roles as Role[],
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(204).send();
  };
}
