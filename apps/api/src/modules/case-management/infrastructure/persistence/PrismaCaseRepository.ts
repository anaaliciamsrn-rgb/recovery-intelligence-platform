import { type Case as PrismaCaseRecord, type PrismaClient, Prisma } from "@prisma/client";
import { Case } from "../../domain/entities/Case.js";
import type {
  CaseFilter,
  CasePage,
  CasePagination,
  ICaseRepository,
} from "../../domain/repositories/ICaseRepository.js";
import type { CasePriority } from "../../domain/value-objects/CasePriority.js";
import type { CaseStatus } from "../../domain/value-objects/CaseStatus.js";

export class PrismaCaseRepository implements ICaseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Case | null> {
    const record = await this.prisma.case.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async save(caso: Case): Promise<void> {
    const props = caso.toProps();
    const data = {
      dossieId: props.dossieId,
      status: props.status,
      ownerId: props.ownerId,
      priority: props.priority,
      tags: props.tags,
      proximaAcao: props.proximaAcao,
      dataProximaAcao: props.dataProximaAcao,
    };

    await this.prisma.case.upsert({
      where: { id: props.id },
      create: { id: props.id, ...data },
      update: data,
    });
  }

  async findMany(filter: CaseFilter, pagination: CasePagination): Promise<CasePage> {
    const where: Prisma.CaseWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
      ...(filter.dossieId ? { dossieId: filter.dossieId } : {}),
    };
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [records, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async findManyByDossieIds(
    dossieIds: string[],
    filter: CaseFilter,
    pagination: CasePagination,
  ): Promise<CasePage> {
    if (dossieIds.length === 0) {
      return { items: [], total: 0, page: pagination.page, pageSize: pagination.pageSize };
    }
    if (filter.dossieId && !dossieIds.includes(filter.dossieId)) {
      return { items: [], total: 0, page: pagination.page, pageSize: pagination.pageSize };
    }

    const where: Prisma.CaseWhereInput = {
      dossieId: filter.dossieId ? filter.dossieId : { in: dossieIds },
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
      ...(filter.priority ? { priority: filter.priority } : {}),
    };
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [records, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  private toDomain(record: PrismaCaseRecord): Case {
    return Case.create({
      id: record.id,
      dossieId: record.dossieId,
      status: record.status as CaseStatus,
      ownerId: record.ownerId,
      priority: record.priority as CasePriority,
      tags: record.tags,
      proximaAcao: record.proximaAcao,
      dataProximaAcao: record.dataProximaAcao,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
