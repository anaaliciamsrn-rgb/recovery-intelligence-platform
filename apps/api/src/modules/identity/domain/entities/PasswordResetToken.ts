export interface PasswordResetTokenProps {
  id: string;
  userId: string;
  /** SHA-256 do token opaco (mesmo `ITokenHasher` do refresh token) — nunca o valor puro é persistido. */
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * Token de uso único para o fluxo "esqueci minha senha". Diferente do
 * `RefreshToken`, não rotaciona — só é criado, consultado uma vez e marcado
 * como usado (`markUsed`). Um token já usado nunca é aceito de novo, mesmo
 * dentro da validade original.
 */
export class PasswordResetToken {
  private constructor(private readonly props: PasswordResetTokenProps) {}

  static create(props: PasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt <= now;
  }

  isValid(now: Date): boolean {
    return this.props.usedAt === null && !this.isExpired(now);
  }

  markUsed(now: Date): void {
    this.props.usedAt = now;
  }

  toProps(): Readonly<PasswordResetTokenProps> {
    return { ...this.props };
  }
}
