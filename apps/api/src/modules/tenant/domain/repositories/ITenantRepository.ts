import type { Tenant } from "../entities/Tenant.js";

export interface ITenantRepository {
  findById(id: string): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  save(tenant: Tenant): Promise<void>;
  findAll(): Promise<Tenant[]>;
}
