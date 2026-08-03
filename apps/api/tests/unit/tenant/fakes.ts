import type { IClock } from "../../../src/modules/tenant/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/tenant/application/ports/IIdGenerator.js";
import type { Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";
import type { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import type { ITenantRepository } from "../../../src/modules/tenant/domain/repositories/ITenantRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../src/modules/tenant/domain/repositories/ITenantResourceOwnershipRepository.js";

export class FakeTenantRepository implements ITenantRepository {
  private readonly tenantsById = new Map<string, Tenant>();

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantsById.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return [...this.tenantsById.values()].find((tenant) => tenant.slug === slug) ?? null;
  }

  async save(tenant: Tenant): Promise<void> {
    this.tenantsById.set(tenant.id, tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return [...this.tenantsById.values()];
  }

  seed(tenant: Tenant): void {
    this.tenantsById.set(tenant.id, tenant);
  }
}

export class FakeTenantResourceOwnershipRepository implements ITenantResourceOwnershipRepository {
  private readonly ownerships: TenantResourceOwnership[] = [];

  async save(ownership: TenantResourceOwnership): Promise<void> {
    this.ownerships.push(ownership);
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<TenantResourceOwnership | null> {
    return (
      this.ownerships.find(
        (ownership) =>
          ownership.resourceType === resourceType && ownership.resourceId === resourceId,
      ) ?? null
    );
  }

  async listResourceIds(tenantId: string, resourceType: string): Promise<string[]> {
    return this.ownerships
      .filter(
        (ownership) => ownership.tenantId === tenantId && ownership.resourceType === resourceType,
      )
      .map((ownership) => ownership.resourceId);
  }

  async deleteByTenantAndType(tenantId: string, resourceType: string): Promise<void> {
    const remaining = this.ownerships.filter(
      (ownership) => !(ownership.tenantId === tenantId && ownership.resourceType === resourceType),
    );
    this.ownerships.length = 0;
    this.ownerships.push(...remaining);
  }

  seed(ownership: TenantResourceOwnership): void {
    this.ownerships.push(ownership);
  }
}

export class FakeIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
