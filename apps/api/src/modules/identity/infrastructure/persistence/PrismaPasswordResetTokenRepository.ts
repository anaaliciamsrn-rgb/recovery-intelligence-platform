import type { PrismaClient } from "@prisma/client";
import { PasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import type { IPasswordResetTokenRepository } from "../../domain/repositories/IPasswordResetTokenRepository.js";

export class PrismaPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record) return null;
    return PasswordResetToken.create({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      usedAt: record.usedAt,
      createdAt: record.createdAt,
    });
  }

  async save(token: PasswordResetToken): Promise<void> {
    const props = token.toProps();
    await this.prisma.passwordResetToken.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        userId: props.userId,
        tokenHash: props.tokenHash,
        expiresAt: props.expiresAt,
        usedAt: props.usedAt,
        createdAt: props.createdAt,
      },
      update: {
        usedAt: props.usedAt,
      },
    });
  }
}
