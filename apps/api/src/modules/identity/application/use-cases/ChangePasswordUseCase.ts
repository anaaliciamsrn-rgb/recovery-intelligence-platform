import { AppError } from "../../../../application/errors/AppError.js";
import type { IPasswordHasher } from "../../../../application/ports/IPasswordHasher.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { PasswordHash } from "../../domain/value-objects/PasswordHash.js";
import { PlainPassword } from "../../domain/value-objects/PlainPassword.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/** Troca de senha autenticada (tela "Minha Conta") — sempre exige a senha atual, diferente do fluxo de reset por e-mail. */
export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const now = this.clock.now();
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError("NOT_FOUND", "Usuário não encontrado");
    }

    const currentMatches = await this.passwordHasher.verify(
      input.currentPassword,
      user.passwordHash.toString(),
    );
    if (!currentMatches) {
      throw new AppError("UNAUTHORIZED", "Senha atual incorreta");
    }

    const plainPassword = PlainPassword.create(input.newPassword);
    const hash = await this.passwordHasher.hash(plainPassword.reveal());
    user.changePassword(PasswordHash.fromHash(hash), now);
    await this.userRepository.save(user);

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: user.id,
      eventType: "PASSWORD_CHANGED",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: null,
    });
    await this.auditLogRepository.append(entry);
  }
}
