import type { PrismaClient, Tenant as PrismaTenantRecord } from "@prisma/client";
import { Tenant } from "../../domain/entities/Tenant.js";
import type { ITenantRepository } from "../../domain/repositories/ITenantRepository.js";

export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const record = await this.prisma.tenant.findUnique({ where: { slug } });
    return record ? this.toDomain(record) : null;
  }

  async save(tenant: Tenant): Promise<void> {
    const props = tenant.toProps();
    await this.prisma.tenant.upsert({
      where: { id: props.id },
      create: { id: props.id, nome: props.nome, slug: props.slug, ativo: props.ativo },
      update: { nome: props.nome, slug: props.slug, ativo: props.ativo },
    });
  }

  async findAll(): Promise<Tenant[]> {
    const records = await this.prisma.tenant.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaTenantRecord): Tenant {
    return Tenant.create({
      id: record.id,
      nome: record.nome,
      slug: record.slug,
      ativo: record.ativo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
