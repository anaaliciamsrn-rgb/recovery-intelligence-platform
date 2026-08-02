import type { PrismaClient } from "@prisma/client";
import type { FeatureFlagOverride as FeatureFlagOverrideRecord } from "@prisma/client";
import { FeatureFlagOverride } from "../../domain/entities/FeatureFlagOverride.js";
import type { IFeatureFlagOverrideRepository } from "../../domain/repositories/IFeatureFlagOverrideRepository.js";
import type { FeatureFlagScopeType } from "../../domain/value-objects/FeatureFlagScope.js";

export class PrismaFeatureFlagOverrideRepository implements IFeatureFlagOverrideRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByFeatureFlagId(featureFlagId: string): Promise<FeatureFlagOverride[]> {
    const records = await this.prisma.featureFlagOverride.findMany({ where: { featureFlagId } });
    return records.map((record) => this.toDomain(record));
  }

  async findOne(
    featureFlagId: string,
    escopoTipo: FeatureFlagScopeType,
    escopoValor: string,
  ): Promise<FeatureFlagOverride | null> {
    const record = await this.prisma.featureFlagOverride.findUnique({
      where: { featureFlagId_escopoTipo_escopoValor: { featureFlagId, escopoTipo, escopoValor } },
    });
    return record ? this.toDomain(record) : null;
  }

  async save(override: FeatureFlagOverride): Promise<void> {
    const props = override.toProps();
    await this.prisma.featureFlagOverride.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        featureFlagId: props.featureFlagId,
        escopoTipo: props.escopoTipo,
        escopoValor: props.escopoValor,
        ativo: props.ativo,
      },
      update: { ativo: props.ativo },
    });
  }

  async remove(
    featureFlagId: string,
    escopoTipo: FeatureFlagScopeType,
    escopoValor: string,
  ): Promise<void> {
    await this.prisma.featureFlagOverride.deleteMany({
      where: { featureFlagId, escopoTipo, escopoValor },
    });
  }

  private toDomain(record: FeatureFlagOverrideRecord): FeatureFlagOverride {
    return FeatureFlagOverride.create({
      id: record.id,
      featureFlagId: record.featureFlagId,
      escopoTipo: record.escopoTipo,
      escopoValor: record.escopoValor,
      ativo: record.ativo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
