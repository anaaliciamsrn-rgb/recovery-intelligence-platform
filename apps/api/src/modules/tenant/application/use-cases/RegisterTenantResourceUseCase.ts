import { AppError } from "../../../../application/errors/AppError.js";
import { TenantResourceOwnership } from "../../domain/entities/TenantResourceOwnership.js";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../domain/repositories/ITenantResourceOwnershipRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface RegisterTenantResourceInput {
  tenantId: string;
  resourceType: string;
  resourceId: string;
}

/**
 * Registra a propriedade de um recurso — a constraint `@@unique` no banco
 * (`resourceType`, `resourceId`) impede que o mesmo recurso seja
 * registrado para dois tenants diferentes; aqui isso vira um `CONFLICT`
 * explícito em vez de um erro de banco genérico. Ver ADR 0028.
 */
export class RegisterTenantResourceUseCase {
  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: RegisterTenantResourceInput): Promise<TenantResourceOwnership> {
    const tenant = await this.tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new AppError("VALIDATION", "Tenant não encontrado para o tenantId informado");
    }

    const existente = await this.tenantResourceOwnershipRepository.findByResource(
      input.resourceType,
      input.resourceId,
    );
    if (existente && existente.tenantId !== input.tenantId) {
      throw new AppError(
        "CONFLICT",
        `Recurso "${input.resourceType}:${input.resourceId}" já pertence a outro tenant`,
      );
    }
    if (existente) {
      return existente;
    }

    const ownership = TenantResourceOwnership.create({
      id: this.idGenerator.generateId(),
      tenantId: input.tenantId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      createdAt: this.clock.now(),
    });

    await this.tenantResourceOwnershipRepository.save(ownership);
    return ownership;
  }
}
