/**
 * Claims do access token (JWT). Vive no shared kernel — por isso `roles` é
 * `string[]` genérico, não o tipo `Role` do módulo identity (o shared kernel
 * nunca depende de um bounded context específico).
 */
export interface AccessTokenClaims {
  /** userId */
  sub: string;
  /** sessionId */
  sid: string;
  roles: string[];
  /**
   * Tenant do usuário — resolvido em `identity` via `TenantResourceOwnership`
   * (módulo `tenant`, ver ADR 0037), nunca vindo de input do chamador. Todo
   * usuário tem exatamente um tenant desde o autocadastro; ausência aqui
   * (contas herdadas de antes desta fase) é tratada como erro pelo módulo
   * que emite o token, não pelos módulos que só leem `req.auth.tenantId`.
   */
  tenantId: string;
}

/**
 * Só o access token passa por aqui — é o único que precisa ser
 * auto-verificável sem round-trip. O refresh token é opaco (ver ADR 0010),
 * não passa por este port. Implementação real: `infrastructure/security`.
 */
export interface ITokenProvider {
  signAccessToken(claims: AccessTokenClaims, expiresInSeconds: number): string;
  /** Lança se o token for inválido, expirado ou tiver assinatura violada. */
  verifyAccessToken(token: string): AccessTokenClaims;
}
