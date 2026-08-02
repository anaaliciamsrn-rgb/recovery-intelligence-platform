import type { PrismaClient } from "@prisma/client";
import type { JobExecutionEntry as JobExecutionEntryRecord } from "@prisma/client";
import { JobExecutionEntry } from "../../domain/entities/JobExecutionEntry.js";
import type { IJobExecutionRepository } from "../../domain/repositories/IJobExecutionRepository.js";

export class PrismaJobExecutionRepository implements IJobExecutionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async append(entrada: JobExecutionEntry): Promise<void> {
    const props = entrada.toProps();
    await this.prisma.jobExecutionEntry.create({
      data: {
        id: props.id,
        scheduledJobId: props.scheduledJobId,
        tentativa: props.tentativa,
        status: props.status,
        erro: props.erro,
        iniciadoEm: props.iniciadoEm,
        finalizadoEm: props.finalizadoEm,
        duracaoMs: props.duracaoMs,
      },
    });
  }

  async findByScheduledJobId(scheduledJobId: string): Promise<JobExecutionEntry[]> {
    const records = await this.prisma.jobExecutionEntry.findMany({
      where: { scheduledJobId },
      orderBy: { iniciadoEm: "desc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: JobExecutionEntryRecord): JobExecutionEntry {
    return JobExecutionEntry.create({
      id: record.id,
      scheduledJobId: record.scheduledJobId,
      tentativa: record.tentativa,
      status: record.status,
      erro: record.erro,
      iniciadoEm: record.iniciadoEm,
      finalizadoEm: record.finalizadoEm,
      duracaoMs: record.duracaoMs,
    });
  }
}
