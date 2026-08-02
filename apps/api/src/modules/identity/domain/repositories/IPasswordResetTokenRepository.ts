import type { PasswordResetToken } from "../entities/PasswordResetToken.js";

export interface IPasswordResetTokenRepository {
  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;
  save(token: PasswordResetToken): Promise<void>;
}
