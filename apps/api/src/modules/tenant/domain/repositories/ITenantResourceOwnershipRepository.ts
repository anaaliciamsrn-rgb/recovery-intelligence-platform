import type { TenantResourceOwnership } from "../entities/TenantResourceOwnership.js";

export interface ITenantResourceOwnershipRepository {
  save(ownership: TenantResourceOwnership): Promise<void>;
  findByResource(resourceType: string, resourceId: string): Promise<TenantResourceOwnership | null>;
}
