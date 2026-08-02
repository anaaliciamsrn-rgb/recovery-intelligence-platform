import { AppError } from "../../../../application/errors/AppError.js";
import type { IOAuthProvider, OAuthProfile } from "../../application/ports/IOAuthProvider.js";

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** "common" aceita conta pessoal e corporativa; um tenant ID específico restringe a uma organização. */
  tenantId: string;
}

interface MicrosoftTokenResponse {
  access_token: string;
}

interface MicrosoftGraphMeResponse {
  mail?: string;
  userPrincipalName: string;
  displayName?: string;
}

/** Fluxo Authorization Code do Microsoft Entra ID (Azure AD) v2.0 — chamadas reais ao Microsoft Graph, nenhuma simulação. */
export class MicrosoftOAuthProvider implements IOAuthProvider {
  constructor(private readonly config: MicrosoftOAuthConfig) {}

  private get authorizationEndpoint(): string {
    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize`;
  }

  private get tokenEndpoint(): string {
    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
  }

  getAuthorizationUrl(state: string): string {
    const url = new URL(this.authorizationEndpoint);
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile User.Read");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenResponse = await fetch(this.tokenEndpoint, {
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
      throw new AppError("UNAUTHORIZED", "Não foi possível concluir o login com Microsoft");
    }

    const { access_token: accessToken } = (await tokenResponse.json()) as MicrosoftTokenResponse;

    const meResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
      throw new AppError("UNAUTHORIZED", "Não foi possível obter o perfil da conta Microsoft");
    }

    const profile = (await meResponse.json()) as MicrosoftGraphMeResponse;
    return { email: profile.mail ?? profile.userPrincipalName, name: profile.displayName ?? null };
  }
}
