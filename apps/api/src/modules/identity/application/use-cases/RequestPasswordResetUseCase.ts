import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { PasswordResetToken } from "../../domain/entities/PasswordResetToken.js";
import { Email } from "../../domain/value-objects/Email.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { IPasswordResetTokenRepository } from "../../domain/repositories/IPasswordResetTokenRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IEmailProvider } from "../ports/IEmailProvider.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";

export interface RequestPasswordResetInput {
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * "Esqueci minha senha". Mesma disciplina anti-enumeração do `LoginUseCase`
 * (ADR 0010): a resposta ao chamador nunca revela se o e-mail existe — o
 * caller sempre recebe sucesso genérico ("se o e-mail existir, enviamos um
 * link"), e-mail nenhum é disparado se o usuário não existir. A diferenciação
 * fica só na auditoria interna.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly emailProvider: IEmailProvider,
    private readonly tokenHasher: ITokenHasher,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
    private readonly appUrl: string,
    private readonly tokenTtlSeconds: number,
  ) {}

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const now = this.clock.now();

    let email: Email;
    try {
      email = Email.create(input.email);
    } catch {
      return; // formato inválido: mesmo silêncio de um e-mail inexistente, nunca revela nada ao chamador.
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const rawToken = this.idGenerator.generateSecureToken();
    const token = PasswordResetToken.create({
      id: this.idGenerator.generateId(),
      userId: user.id,
      tokenHash: this.tokenHasher.hash(rawToken),
      expiresAt: new Date(now.getTime() + this.tokenTtlSeconds * 1000),
      usedAt: null,
      createdAt: now,
    });
    await this.passwordResetTokenRepository.save(token);

    const resetLink = `${this.appUrl}/redefinir-senha?token=${encodeURIComponent(rawToken)}`;
    await this.emailProvider.sendPasswordResetEmail(email.toString(), resetLink);

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: user.id,
      eventType: "PASSWORD_RESET_REQUESTED",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: null,
    });
    await this.auditLogRepository.append(entry);
  }
}
