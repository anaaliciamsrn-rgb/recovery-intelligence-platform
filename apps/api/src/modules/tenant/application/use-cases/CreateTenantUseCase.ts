import { AppError } from "../../../../application/errors/AppError.js";
import { InvalidTenantError, Tenant } from "../../domain/entities/Tenant.js";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateTenantInput {
  nome: string;
  slug: string;
}

export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepository: ITenantRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateTenantInput): Promise<Tenant> {
    const existente = await this.tenantRepository.findBySlug(input.slug);
    if (existente) {
      throw new AppError("CONFLICT", `Já existe um tenant com o slug "${input.slug}"`);
    }

    const now = this.clock.now();
    let tenant: Tenant;
    try {
      tenant = Tenant.create({
        id: this.idGenerator.generateId(),
        nome: input.nome,
        slug: input.slug,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      if (error instanceof InvalidTenantError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }

    await this.tenantRepository.save(tenant);
    return tenant;
  }
}
