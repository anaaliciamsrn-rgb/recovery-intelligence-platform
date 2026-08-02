import type { PrismaClient } from "@prisma/client";
import type { FeatureFlag as FeatureFlagRecord } from "@prisma/client";
import { FeatureFlag } from "../../domain/entities/FeatureFlag.js";
import type {
  FeatureFlagPage,
  FeatureFlagPagination,
  IFeatureFlagRepository,
} from "../../domain/repositories/IFeatureFlagRepository.js";

export class PrismaFeatureFlagRepository implements IFeatureFlagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<FeatureFlag | null> {
    const record = await this.prisma.featureFlag.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByChave(chave: string): Promise<FeatureFlag | null> {
    const record = await this.prisma.featureFlag.findUnique({ where: { chave } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<FeatureFlag[]> {
    const records = await this.prisma.featureFlag.findMany({ orderBy: { chave: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async findMany(pagination: FeatureFlagPagination): Promise<FeatureFlagPage> {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const [records, total] = await Promise.all([
      this.prisma.featureFlag.findMany({
        orderBy: { chave: "asc" },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.featureFlag.count(),
    ]);
    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async save(flag: FeatureFlag): Promise<void> {
    const props = flag.toProps();
    await this.prisma.featureFlag.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        chave: props.chave,
        descricao: props.descricao,
        ativoPadrao: props.ativoPadrao,
      },
      update: { descricao: props.descricao, ativoPadrao: props.ativoPadrao },
    });
  }

  private toDomain(record: FeatureFlagRecord): FeatureFlag {
    return FeatureFlag.create({
      id: record.id,
      chave: record.chave,
      descricao: record.descricao,
      ativoPadrao: record.ativoPadrao,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
