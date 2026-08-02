import type { PrismaClient, CaseNote as PrismaCaseNoteRecord } from "@prisma/client";
import { CaseNote } from "../../domain/entities/CaseNote.js";
import type { ICaseNoteRepository } from "../../domain/repositories/ICaseNoteRepository.js";

export class PrismaCaseNoteRepository implements ICaseNoteRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(nota: CaseNote): Promise<void> {
    const props = nota.toProps();
    await this.prisma.caseNote.create({
      data: {
        id: props.id,
        caseId: props.caseId,
        autorId: props.autorId,
        texto: props.texto,
        createdAt: props.createdAt,
      },
    });
  }

  async findByCaseId(caseId: string): Promise<CaseNote[]> {
    const records = await this.prisma.caseNote.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: PrismaCaseNoteRecord): CaseNote {
    return CaseNote.create({
      id: record.id,
      caseId: record.caseId,
      autorId: record.autorId,
      texto: record.texto,
      createdAt: record.createdAt,
    });
  }
}
