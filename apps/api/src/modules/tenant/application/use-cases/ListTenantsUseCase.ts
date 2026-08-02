import type { Tenant } from "../../domain/entities/Tenant.js";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";

export class ListTenantsUseCase {
  constructor(private readonly tenantRepository: ITenantRepository) {}

  async execute(): Promise<Tenant[]> {
    return this.tenantRepository.findAll();
  }
}
