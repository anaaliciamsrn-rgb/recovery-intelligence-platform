import { type PrismaClient, Prisma } from "@prisma/client";
import type { ScheduledJob as ScheduledJobRecord } from "@prisma/client";
import { ScheduledJob } from "../../domain/entities/ScheduledJob.js";
import type {
  IScheduledJobRepository,
  ScheduledJobFilter,
  ScheduledJobPage,
  ScheduledJobPagination,
} from "../../domain/repositories/IScheduledJobRepository.js";
import { ScheduledJobStatus } from "../../domain/value-objects/ScheduledJobStatus.js";

export class PrismaScheduledJobRepository implements IScheduledJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ScheduledJob | null> {
    const record = await this.prisma.scheduledJob.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(filter?: ScheduledJobFilter): Promise<ScheduledJob[]> {
    const records = await this.prisma.scheduledJob.findMany({
      where: filter?.status !== undefined ? { status: filter.status } : {},
      orderBy: { agendadoPara: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findMany(
    filter: ScheduledJobFilter,
    pagination: ScheduledJobPagination,
  ): Promise<ScheduledJobPage> {
    const where = filter.status !== undefined ? { status: filter.status } : {};
    const skip = (pagination.page - 1) * pagination.pageSize;

    const [records, total] = await Promise.all([
      this.prisma.scheduledJob.findMany({
        where,
        orderBy: { agendadoPara: "asc" },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.scheduledJob.count({ where }),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async findDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const records = await this.prisma.scheduledJob.findMany({
      where: { status: ScheduledJobStatus.PENDENTE, agendadoPara: { lte: now } },
      orderBy: { agendadoPara: "asc" },
      take: limit,
    });
    return records.map((record) => this.toDomain(record));
  }

  async save(job: ScheduledJob): Promise<void> {
    const props = job.toProps();
    const payload = props.payload as unknown as Prisma.InputJsonValue;
    await this.prisma.scheduledJob.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        nome: props.nome,
        tipo: props.tipo,
        payload,
        status: props.status,
        agendadoPara: props.agendadoPara,
        tentativas: props.tentativas,
        maxTentativas: props.maxTentativas,
        ultimoErro: props.ultimoErro,
      },
      update: {
        status: props.status,
        agendadoPara: props.agendadoPara,
        tentativas: props.tentativas,
        ultimoErro: props.ultimoErro,
      },
    });
  }

  private toDomain(record: ScheduledJobRecord): ScheduledJob {
    return ScheduledJob.agendar({
      id: record.id,
      nome: record.nome,
      tipo: record.tipo,
      payload: record.payload as Record<string, unknown>,
      status: record.status,
      agendadoPara: record.agendadoPara,
      tentativas: record.tentativas,
      maxTentativas: record.maxTentativas,
      ultimoErro: record.ultimoErro,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
