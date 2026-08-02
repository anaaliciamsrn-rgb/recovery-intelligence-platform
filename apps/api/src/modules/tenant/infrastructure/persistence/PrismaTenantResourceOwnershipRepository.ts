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
