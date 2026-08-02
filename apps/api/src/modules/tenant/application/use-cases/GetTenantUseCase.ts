import { AppError } from "../../../../application/errors/AppError.js";
import type { Tenant } from "../../domain/entities/Tenant.js";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";

export class GetTenantUseCase {
  constructor(private readonly tenantRepository: ITenantRepository) {}

  async execute(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new AppError("NOT_FOUND", "Tenant não encontrado");
    }
    return tenant;
  }
}
