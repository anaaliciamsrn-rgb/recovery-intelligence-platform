import { AppError } from "../../../../application/errors/AppError.js";
import { AuditLogEntry } from "../../domain/entities/AuditLogEntry.js";
import { Role } from "../../domain/value-objects/Role.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface AssignUserRolesInput {
  targetUserId: string;
  roles: string[];
  actorUserId: string;
  ipAddress: string | null;
  userAgent: string | null;
}

const VALID_ROLES = new Set<string>(Object.values(Role));

/**
 * "Aprovar conta" na prática: um admin troca o papel de um usuário recém
 * autocadastrado (sempre `VIEWER`, sem permissão nenhuma — ver
 * `RegisterUseCase`) para o que ele deve de fato ter. Guarda contra remover
 * `ADMIN` do último administrador do sistema — sem isso, um clique errado
 * tranca todo mundo fora, sem ninguém com `identity:manage-users` para
 * desfazer.
 */
export class AssignUserRolesUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: AssignUserRolesInput): Promise<void> {
    if (input.roles.length === 0) {
      throw new AppError("VALIDATION", "Informe ao menos um papel");
    }
    for (const role of input.roles) {
      if (!VALID_ROLES.has(role)) {
        throw new AppError("VALIDATION", `Papel desconhecido: ${role}`);
      }
    }

    const targetUser = await this.userRepository.findById(input.targetUserId);
    if (!targetUser) {
      throw new AppError("NOT_FOUND", "Usuário não encontrado");
    }

    const removingAdmin =
      targetUser.roles.includes(Role.ADMIN) && !input.roles.includes(Role.ADMIN);
    if (removingAdmin) {
      const allUsers = await this.userRepository.findAll();
      const remainingAdmins = allUsers.filter(
        (user) => user.id !== targetUser.id && user.roles.includes(Role.ADMIN),
      );
      if (remainingAdmins.length === 0) {
        throw new AppError("CONFLICT", "Não é possível remover o último administrador do sistema");
      }
    }

    const now = this.clock.now();
    targetUser.assignRoles(input.roles as Role[], now);
    await this.userRepository.save(targetUser);

    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: now,
      actorUserId: input.actorUserId,
      eventType: "USER_ROLES_ASSIGNED",
      outcome: "SUCCESS",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: { targetUserId: targetUser.id, roles: input.roles },
    });
    await this.auditLogRepository.append(entry);
  }
}
