import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { OAuthLoginUseCase } from "../../application/use-cases/OAuthLoginUseCase.js";
import type { IOAuthProvider } from "../../application/ports/IOAuthProvider.js";
import type { RefreshTokenCookieConfig } from "./AuthController.js";

export type OAuthProviderName = "google" | "microsoft";

const OAUTH_STATE_COOKIE_PREFIX = "rip_oauth_state_";
const OAUTH_STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";

/**
 * Só existe uma entrada no `providers` map para um provedor quando
 * `client id` + `secret` estão configurados no ambiente (ver
 * `identity/container.ts`) — nunca uma rota que finge funcionar sem
 * credencial real. `GET /auth/oauth/providers` é a fonte de verdade que o
 * frontend consulta para decidir se mostra o botão real ou "em breve".
 */
export class OAuthController {
  constructor(
    private readonly providers: Partial<Record<OAuthProviderName, IOAuthProvider>>,
    private readonly oauthLoginUseCase: OAuthLoginUseCase,
    private readonly cookieConfig: RefreshTokenCookieConfig,
    private readonly appUrl: string,
  ) {}

  listProviders = (_req: Request, res: Response): void => {
    res.status(200).json({
      google: Boolean(this.providers.google),
      microsoft: Boolean(this.providers.microsoft),
    });
  };

  authorize = (req: Request, res: Response): void => {
    const provider = this.resolveProvider(req.params.provider);
    const state = randomUUID();

    res.cookie(this.stateCookieName(req.params.provider), state, {
      httpOnly: true,
      secure: this.cookieConfig.secure,
      sameSite: "lax",
      maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
      path: REFRESH_TOKEN_COOKIE_PATH,
    });

    res.redirect(provider.getAuthorizationUrl(state));
  };

  callback = async (req: Request, res: Response): Promise<void> => {
    const provider = this.resolveProvider(req.params.provider);
    const code = typeof req.query.code === "string" ? req.query.code : null;
    const state = typeof req.query.state === "string" ? req.query.state : null;
    const stateCookieName = this.stateCookieName(req.params.provider);
    const expectedState = req.cookies?.[stateCookieName];

    res.clearCookie(stateCookieName, { path: REFRESH_TOKEN_COOKIE_PATH });

    if (!code || !state || !expectedState || state !== expectedState) {
      throw new AppError("UNAUTHORIZED", "Estado OAuth inválido — tente novamente");
    }

    const profile = await provider.exchangeCodeForProfile(code);

    const result = await this.oauthLoginUseCase.execute({
      profile,
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    });

    res.cookie(this.cookieConfig.name, result.refreshToken, {
      httpOnly: true,
      secure: this.cookieConfig.secure,
      sameSite: "strict",
      maxAge: this.cookieConfig.maxAgeMs,
      path: REFRESH_TOKEN_COOKIE_PATH,
    });

    // Nenhum token na URL de propósito — o frontend já reidrata a sessão a
    // partir do cookie httpOnly ao carregar `/app` (mesmo bootstrap do
    // AuthProvider usado após um F5), sem precisar de lógica nova.
    res.redirect(`${this.appUrl}/app`);
  };

  private resolveProvider(rawName: string | undefined): IOAuthProvider {
    const name = rawName as OAuthProviderName;
    const provider = this.providers[name];
    if (!provider) {
      throw new AppError("NOT_FOUND", `Provedor OAuth "${rawName}" não está configurado`);
    }
    return provider;
  }

  private stateCookieName(rawName: string | undefined): string {
    return `${OAUTH_STATE_COOKIE_PREFIX}${rawName ?? "unknown"}`;
  }
}
