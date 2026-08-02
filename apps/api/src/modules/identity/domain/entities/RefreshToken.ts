export interface RefreshTokenProps {
  id: string;
  sessionId: string;
  /** SHA-256 do token opaco — nunca o valor puro (ver ADR 0010). */
  tokenHash: string;
  familyId: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
}

/**
 * Entidade filha do agregado `Session`. Uma linha por token emitido, não só
 * o atual — a cadeia via `replacedByTokenId` é o que viabiliza detecção de
 * reuso (token já substituído sendo apresentado de novo = sinal de roubo).
 */
export class RefreshToken {
  private constructor(private readonly props: RefreshTokenProps) {}

  static create(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  get id(): string {
    return this.props.id;
  }

  get sessionId(): string {
    return this.props.sessionId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get replacedByTokenId(): string | null {
    return this.props.replacedByTokenId;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  isReused(): boolean {
    return this.props.replacedByTokenId !== null || this.props.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt <= now;
  }

  isValid(now: Date): boolean {
    return !this.isReused() && !this.isExpired(now);
  }

  revoke(now: Date): void {
    this.props.revokedAt = now;
  }

  markReplacedBy(newTokenId: string, now: Date): void {
    this.props.replacedByTokenId = newTokenId;
    this.revoke(now);
  }

  toProps(): Readonly<RefreshTokenProps> {
    return { ...this.props };
  }
}
