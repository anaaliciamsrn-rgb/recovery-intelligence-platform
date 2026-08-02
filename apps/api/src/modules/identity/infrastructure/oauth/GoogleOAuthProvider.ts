import { AppError } from "../../../../application/errors/AppError.js";
import type { IOAuthProvider, OAuthProfile } from "../../application/ports/IOAuthProvider.js";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

interface GoogleTokenResponse {
  access_token: string;
}

interface GoogleUserInfoResponse {
  email: string;
  name?: string;
  email_verified?: boolean;
}

/** Fluxo Authorization Code padrão do OAuth 2.0/OIDC — nenhuma simulação, chamadas reais aos endpoints do Google. */
export class GoogleOAuthProvider implements IOAuthProvider {
  constructor(private readonly config: GoogleOAuthConfig) {}

  getAuthorizationUrl(state: string): string {
    const url = new URL(AUTHORIZATION_ENDPOINT);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new AppError("UNAUTHORIZED", "Não foi possível concluir o login com Google");
    }

    const { access_token: accessToken } = (await tokenResponse.json()) as GoogleTokenResponse;

    const userInfoResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      throw new AppError("UNAUTHORIZED", "Não foi possível obter o perfil da conta Google");
    }

    const profile = (await userInfoResponse.json()) as GoogleUserInfoResponse;
    return { email: profile.email, name: profile.name ?? null };
  }
}
