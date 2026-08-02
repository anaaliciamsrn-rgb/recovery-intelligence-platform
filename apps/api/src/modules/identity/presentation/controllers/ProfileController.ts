import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { ChangePasswordUseCase } from "../../application/use-cases/ChangePasswordUseCase.js";
import type { UpdateProfileUseCase } from "../../application/use-cases/UpdateProfileUseCase.js";
import {
  changePasswordRequestSchema,
  updateProfileRequestSchema,
} from "../validators/auth.validators.js";

/** Tela "Minha Conta" — sempre exige autenticação (montado com `authenticate` em auth.routes.ts). */
export class ProfileController {
  constructor(
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
  ) {}

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const body = parseRequestBody(updateProfileRequestSchema, req.body);

    const result = await this.updateProfileUseCase.execute({
      userId: req.auth.userId,
      nome: body.nome,
      sobrenome: body.sobrenome,
      empresa: body.empresa,
      cargo: body.cargo,
      avatarUrl: body.avatarUrl,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(200).json({ user: result });
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const body = parseRequestBody(changePasswordRequestSchema, req.body);

    await this.changePasswordUseCase.execute({
      userId: req.auth.userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(204).send();
  };
}
