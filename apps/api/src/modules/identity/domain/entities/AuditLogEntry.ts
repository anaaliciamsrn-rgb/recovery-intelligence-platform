export type AuditOutcome = "SUCCESS" | "FAILURE";

export const AuditOutcome = {
  SUCCESS: "SUCCESS",
  FAILURE: "FAILURE",
} as const satisfies Record<string, AuditOutcome>;

/**
 * As variantes LOGIN_FAILURE_* existem para a auditoria interna distinguir
 * o motivo real de uma falha (conta trancada vs senha errada vs email
 * desconhecido), enquanto a resposta HTTP ao chamador é sempre genérica —
 * ver LoginUseCase e ADR 0010 ("não vazar estado de conta").
 */
export type AuditEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE_UNKNOWN_EMAIL"
  | "LOGIN_FAILURE_BAD_PASSWORD"
  | "LOGIN_FAILURE_ACCOUNT_LOCKED"
  | "LOGIN_FAILURE_ACCOUNT_DISABLED"
  | "LOGIN_RATE_LIMITED"
  | "ACCOUNT_LOCKED"
  | "TOKEN_REFRESHED"
  | "REFRESH_TOKEN_INVALID"
  | "REFRESH_TOKEN_REUSE_DETECTED"
  | "LOGOUT"
  | "SESSION_REVOKED"
  | "SESSIONS_REVOKED_ALL"
  | "REGISTER_SUCCESS"
  | "REGISTER_FAILURE_EMAIL_TAKEN"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_RESET_INVALID_TOKEN"
  | "PROFILE_UPDATED"
  | "PASSWORD_CHANGED"
  | "OAUTH_LOGIN_SUCCESS"
  | "USER_ROLES_ASSIGNED";

export interface AuditLogEntryProps {
  id: string;
  occurredAt: Date;
  /** Nulo para eventos disparados pelo próprio sistema, sem ator humano. */
  actorUserId: string | null;
  eventType: AuditEventType;
  outcome: AuditOutcome;
  ipAddress: string | null;
  userAgent: string | null;
  /** Nunca deve conter segredo (senha, token) — mesma disciplina do redact do Pino. */
  metadata: Record<string, unknown> | null;
}

/** Append-only por design: de propósito não existe nenhum método de mutação. */
export class AuditLogEntry {
  private constructor(private readonly props: AuditLogEntryProps) {}

  static create(props: AuditLogEntryProps): AuditLogEntry {
    return new AuditLogEntry(props);
  }

  toProps(): Readonly<AuditLogEntryProps> {
    return { ...this.props };
  }
}
