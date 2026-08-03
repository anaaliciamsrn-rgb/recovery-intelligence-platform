import type {
  PrismaClient,
  TenantResourceOwnership as PrismaTenantResourceOwnershipRecord,
} from "@prisma/client";
import { TenantResourceOwnership } from "../../domain/entities/TenantResourceOwnership.js";
import type { ITenantResourceOwnershipRepository } from "../../domain/repositories/ITenantResourceOwnershipRepository.js";

export class PrismaTenantResourceOwnershipRepository implements ITenantResourceOwnershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(ownership: TenantResourceOwnership): Promise<void> {
    const props = ownership.toProps();
    await this.prisma.tenantResourceOwnership.create({
      data: {
        id: props.id,
        tenantId: props.tenantId,
        resourceType: props.resourceType,
        resourceId: props.resourceId,
        createdAt: props.createdAt,
      },
    });
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<TenantResourceOwnership | null> {
    const record = await this.prisma.tenantResourceOwnership.findUnique({
      where: { resourceType_resourceId: { resourceType, resourceId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async listResourceIds(tenantId: string, resourceType: string): Promise<string[]> {
    const records = await this.prisma.tenantResourceOwnership.findMany({
      where: { tenantId, resourceType },
      select: { resourceId: true },
    });
    return records.map((record) => record.resourceId);
  }

  async deleteByTenantAndType(tenantId: string, resourceType: string): Promise<void> {
    await this.prisma.tenantResourceOwnership.deleteMany({ where: { tenantId, resourceType } });
  }

  private toDomain(record: PrismaTenantResourceOwnershipRecord): TenantResourceOwnership {
    return TenantResourceOwnership.create({
      id: record.id,
      tenantId: record.tenantId,
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      createdAt: record.createdAt,
    });
  }
}
