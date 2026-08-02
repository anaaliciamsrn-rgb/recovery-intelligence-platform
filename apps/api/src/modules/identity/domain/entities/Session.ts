import type { RefreshToken } from "./RefreshToken.js";

export type SessionStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export const SessionStatus = {
  ACTIVE: "ACTIVE",
  REVOKED: "REVOKED",
  EXPIRED: "EXPIRED",
} as const satisfies Record<string, SessionStatus>;

export interface SessionProps {
  id: string;
  userId: string;
  status: SessionStatus;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  currentRefreshToken: RefreshToken;
}

/**
 * Aggregate root separado de `User` (lifecycle independente — muito mais
 * escrita/leitura que o `User` em si; não vale travar o agregado inteiro a
 * cada login). Referencia `User` só por `userId`, nunca por objeto.
 */
export class Session {
  /**
   * RefreshTokens tocados na operação mais recente (ex.: numa rotação, o
   * token antigo E o novo) — a camada de persistência drena isso via
   * `pullTouchedRefreshTokens()` para saber o que fazer upsert. Sem isso, o
   * token antigo mutado em memória (revogado/encadeado) seria perdido antes
   * de chegar ao banco, porque `props.currentRefreshToken` só guarda o mais
   * recente.
   */
  private touchedRefreshTokens: RefreshToken[] = [];

  private constructor(private props: SessionProps) {}

  static create(props: SessionProps): Session {
    return new Session(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  get currentRefreshToken(): RefreshToken {
    return this.props.currentRefreshToken;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  isActive(now: Date): boolean {
    return this.props.status === SessionStatus.ACTIVE && this.props.expiresAt > now;
  }

  revoke(now: Date): void {
    this.props.status = SessionStatus.REVOKED;
    this.props.currentRefreshToken.revoke(now);
    this.touchedRefreshTokens.push(this.props.currentRefreshToken);
  }

  /**
   * Revoga o token atual (encadeando via replacedByTokenId) e o substitui
   * pelo novo, mesma familyId. Só deve ser chamado depois que o use case já
   * confirmou que o token apresentado é de fato o atual (não um reuso) —
   * ver RefreshTokenUseCase.
   */
  rotateRefreshToken(newToken: RefreshToken, now: Date): void {
    const oldToken = this.props.currentRefreshToken;
    oldToken.markReplacedBy(newToken.id, now);
    this.touchedRefreshTokens.push(oldToken, newToken);
    this.props.currentRefreshToken = newToken;
    this.props.lastUsedAt = now;
  }

  /**
   * Drena a lista de tokens tocados desde a última chamada. Se nada foi
   * tocado ainda (sessão nova, recém-criada), cai no fallback do token
   * atual — cobre o caso de persistir uma Session pela primeira vez.
   */
  pullTouchedRefreshTokens(): RefreshToken[] {
    const tokens =
      this.touchedRefreshTokens.length > 0
        ? this.touchedRefreshTokens
        : [this.props.currentRefreshToken];
    this.touchedRefreshTokens = [];
    return tokens;
  }

  toProps(): Readonly<SessionProps> {
    return { ...this.props };
  }
}
