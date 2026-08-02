import type { CookieOptions, Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { GetCurrentUserUseCase } from "../../application/use-cases/GetCurrentUserUseCase.js";
import type { LoginUseCase } from "../../application/use-cases/LoginUseCase.js";
import type { LogoutAllSessionsUseCase } from "../../application/use-cases/LogoutAllSessionsUseCase.js";
import type { LogoutUseCase } from "../../application/use-cases/LogoutUseCase.js";
import type { RefreshTokenUseCase } from "../../application/use-cases/RefreshTokenUseCase.js";
import type { RegisterUseCase } from "../../application/use-cases/RegisterUseCase.js";
import type { RequestPasswordResetUseCase } from "../../application/use-cases/RequestPasswordResetUseCase.js";
import type { ResetPasswordUseCase } from "../../application/use-cases/ResetPasswordUseCase.js";
import {
  loginRequestSchema,
  registerRequestSchema,
  requestPasswordResetRequestSchema,
  resetPasswordRequestSchema,
} from "../validators/auth.validators.js";

export interface RefreshTokenCookieConfig {
  name: string;
  secure: boolean;
  maxAgeMs: number;
}

/** Escopo restrito ao prefixo de auth — o cookie nunca é enviado em outras rotas da API. */
const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllSessionsUseCase: LogoutAllSessionsUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly requestPasswordResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly cookieConfig: RefreshTokenCookieConfig,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(registerRequestSchema, req.body);

    const result = await this.registerUseCase.execute({
      email: body.email,
      password: body.password,
      nome: body.nome,
      sobrenome: body.sobrenome,
      empresa: body.empresa ?? null,
      cargo: body.cargo ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(201).json({ user: result });
  };

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(requestPasswordResetRequestSchema, req.body);

    await this.requestPasswordResetUseCase.execute({
      email: body.email,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    // Sempre 200, exista ou não o e-mail — ver RequestPasswordResetUseCase.
    res
      .status(200)
      .json({
        message:
          "Se este e-mail estiver cadastrado, você receberá um link de redefinição em breve.",
      });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(resetPasswordRequestSchema, req.body);

    await this.resetPasswordUseCase.execute({
      token: body.token,
      newPassword: body.newPassword,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.status(200).json({ message: "Senha redefinida com sucesso." });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(loginRequestSchema, req.body);

    const result = await this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    this.setRefreshTokenCookie(res, result.refreshToken, body.rememberMe);
    res.status(200).json({ accessToken: result.accessToken, user: result.user });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const rawToken = this.readRefreshTokenCookie(req);

    const result = await this.refreshTokenUseCase.execute({
      refreshToken: rawToken,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    this.setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({ accessToken: result.accessToken });
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const rawToken = req.cookies?.[this.cookieConfig.name];

    if (typeof rawToken === "string") {
      await this.logoutUseCase.execute({
        refreshToken: rawToken,
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      });
    }

    this.clearRefreshTokenCookie(res);
    res.status(204).send();
  };

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    await this.logoutAllSessionsUseCase.execute({
      userId: req.auth.userId,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    this.clearRefreshTokenCookie(res);
    res.status(204).send();
  };

  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const user = await this.getCurrentUserUseCase.execute(req.auth.userId);
    res.status(200).json({ user });
  };

  private readRefreshTokenCookie(req: Request): string {
    const rawToken = req.cookies?.[this.cookieConfig.name];
    if (typeof rawToken !== "string" || rawToken.length === 0) {
      throw new AppError("UNAUTHORIZED", "Refresh token ausente");
    }
    return rawToken;
  }

  /**
   * `rememberMe = false` (padrão `true`, mesmo comportamento de antes desta
   * fase): omite `maxAge` de propósito — sem essa opção, o cookie nasce como
   * cookie de sessão, apagado pelo navegador ao fechar, em vez de persistir
   * pelos `REFRESH_TOKEN_TTL_SECONDS` completos.
   */
  private setRefreshTokenCookie(res: Response, rawToken: string, rememberMe = true): void {
    const options: CookieOptions = {
      httpOnly: true,
      secure: this.cookieConfig.secure,
      sameSite: "strict",
      path: REFRESH_TOKEN_COOKIE_PATH,
    };
    if (rememberMe) {
      options.maxAge = this.cookieConfig.maxAgeMs;
    }
    res.cookie(this.cookieConfig.name, rawToken, options);
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(this.cookieConfig.name, { path: REFRESH_TOKEN_COOKIE_PATH });
  }
}
