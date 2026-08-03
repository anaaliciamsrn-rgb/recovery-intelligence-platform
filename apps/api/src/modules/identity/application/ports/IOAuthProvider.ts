export interface OAuthProfile {
  email: string;
  name: string | null;
}

/**
 * Porta comum a qualquer provedor OAuth 2.0 / OIDC de "login social"
 * (Google, Microsoft Entra ID). Só é instanciada pelo container quando as
 * credenciais do provedor (`client id`/`secret`) estão presentes no
 * ambiente — ver `identity/container.ts` e docs/RELATORIO_AUTH_E_UX.md. Sem isso, o provedor
 * simplesmente não existe no container, e `GET /auth/oauth/providers`
 * reporta `false` para ele — nunca uma implementação que finge funcionar.
 */
export interface IOAuthProvider {
  /** URL para onde o navegador do usuário deve ser redirecionado para autorizar o login. */
  getAuthorizationUrl(state: string): string;
  /** Troca o `code` do callback por um token de acesso do provedor e resolve o perfil (email + nome). */
  exchangeCodeForProfile(code: string): Promise<OAuthProfile>;
}
