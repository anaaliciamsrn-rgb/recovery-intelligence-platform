import type { PrismaClient, CaseHistoryEntry as PrismaCaseHistoryRecord } from "@prisma/client";
import {
  CaseHistoryEntry,
  type CaseHistoryEventType,
} from "../../domain/entities/CaseHistoryEntry.js";
import type { ICaseHistoryRepository } from "../../domain/repositories/ICaseHistoryRepository.js";

export class PrismaCaseHistoryRepository implements ICaseHistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Só `create` — a timeline é append-only por design (ver ADR 0026). */
  async append(entry: CaseHistoryEntry): Promise<void> {
    const props = entry.toProps();
    await this.prisma.caseHistoryEntry.create({
      data: {
        id: props.id,
        caseId: props.caseId,
        tipo: props.tipo,
        descricao: props.descricao,
        autorId: props.autorId,
        timestamp: props.timestamp,
      },
    });
  }

  async findByCaseId(caseId: string): Promise<CaseHistoryEntry[]> {
    const records = await this.prisma.caseHistoryEntry.findMany({
      where: { caseId },
      orderBy: { timestamp: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaCaseHistoryRecord): CaseHistoryEntry {
    return CaseHistoryEntry.create({
      id: record.id,
      caseId: record.caseId,
      tipo: record.tipo as CaseHistoryEventType,
      descricao: record.descricao,
      autorId: record.autorId,
      timestamp: record.timestamp,
    });
  }
}
