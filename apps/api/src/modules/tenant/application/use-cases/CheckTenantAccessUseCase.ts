import { TenantPolicy } from "../../domain/services/TenantPolicy.js";
import type { ITenantResourceOwnershipRepository } from "../../domain/repositories/ITenantResourceOwnershipRepository.js";

export interface CheckTenantAccessInput {
  tenantId: string;
  resourceType: string;
  resourceId: string;
}

/** `GET /tenants/:id/access` — pergunta explícita "este tenant pode acessar este recurso?", nunca assume. Ver ADR 0028. */
export class CheckTenantAccessUseCase {
  constructor(
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(input: CheckTenantAccessInput): Promise<boolean> {
    const ownership = await this.tenantResourceOwnershipRepository.findByResource(
      input.resourceType,
      input.resourceId,
    );
    return TenantPolicy.podeAcessar(ownership, input.tenantId);
  }
}
