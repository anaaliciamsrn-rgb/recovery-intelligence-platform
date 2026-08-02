export interface IIdGenerator {
  /** UUID para identidade de entidade (User, Session, RefreshToken, AuditLogEntry). */
  generateId(): string;
  /** Token opaco de alta entropia (256 bits) — usado como refresh token. */
  generateSecureToken(): string;
}
