import { AppError } from "../../../../application/errors/AppError.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import type { UserProfile } from "../../domain/entities/User.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface UpdateProfileInput extends UserProfile {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface UpdateProfileOutput {
  id: string;
  nome: string | null;
  sobrenome: string | null;
  empresa: string | null;
  cargo: string | null;
  avatarUrl: string | null;
}

/** Tela "Minha Conta" — nunca toca email/senha/papéis (cada um tem seu próprio fluxo dedicado). */
export class UpdateProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: UpdateProfileInput): Promise<UpdateProfileOutput> {
    const now = this.clock.now();
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new AppError("NOT_FOUND", "Usuário não encontrado");
    }

    user.updateProfile(
      {
        nome: input.nome,
        sobrenome: input.sobrenome,
        empresa: input.empresa,
        cargo: input.cargo,
        avatarUrl: input.avatarUrl,
      },
      now,
    );
    await this.userRepository.save(user);

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: user.id,
      eventType: "PROFILE_UPDATED",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: null,
    });
    await this.auditLogRepository.append(entry);

    return {
      id: user.id,
      nome: user.nome,
      sobrenome: user.sobrenome,
      empresa: user.empresa,
      cargo: user.cargo,
      avatarUrl: user.avatarUrl,
    };
  }
}
