import type { PrismaClient, ImportBatch as PrismaImportBatchRecord } from "@prisma/client";
import { ImportBatch } from "../../domain/entities/ImportBatch.js";
import type {
  IImportBatchRepository,
  ImportBatchPage,
  ImportBatchPagination,
} from "../../domain/repositories/IImportBatchRepository.js";

export class PrismaImportBatchRepository implements IImportBatchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ImportBatch | null> {
    const record = await this.prisma.importBatch.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async save(batch: ImportBatch): Promise<void> {
    const props = batch.toProps();

    const data = {
      fonte: props.fonte,
      nomeArquivo: props.nomeArquivo,
      iniciadoEm: props.iniciadoEm,
      finalizadoEm: props.finalizadoEm,
      totalLinhas: props.totalLinhas,
      totalImportadas: props.contagens.importadas,
      totalIgnoradas: props.contagens.ignoradas,
      totalInvalidas: props.contagens.invalidas,
      totalDuplicadas: props.contagens.duplicadas,
      totalErros: props.contagens.erros,
      status: props.status,
      revertidoEm: props.revertidoEm,
      motivoReversao: props.motivoReversao,
      iniciadoPorUsuarioId: props.iniciadoPorUsuarioId,
    };

    await this.prisma.importBatch.upsert({
      where: { id: props.id },
      create: { id: props.id, ...data },
      update: data,
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.prisma.importBatch.deleteMany({ where: { id: { in: ids } } });
  }

  async count(): Promise<number> {
    return this.prisma.importBatch.count();
  }

  async findAll(): Promise<ImportBatch[]> {
    const records = await this.prisma.importBatch.findMany({ orderBy: { createdAt: "desc" } });
    return records.map((record) => this.toDomain(record));
  }

  async findMany(pagination: ImportBatchPagination): Promise<ImportBatchPage> {
    const skip = (pagination.page - 1) * pagination.pageSize;
    const [records, total] = await Promise.all([
      this.prisma.importBatch.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pagination.pageSize,
      }),
      this.prisma.importBatch.count(),
    ]);
    return {
      items: records.map((record) => this.toDomain(record)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  private toDomain(record: PrismaImportBatchRecord): ImportBatch {
    return ImportBatch.create({
      id: record.id,
      fonte: record.fonte,
      nomeArquivo: record.nomeArquivo,
      iniciadoEm: record.iniciadoEm,
      finalizadoEm: record.finalizadoEm,
      totalLinhas: record.totalLinhas,
      contagens: {
        importadas: record.totalImportadas,
        ignoradas: record.totalIgnoradas,
        invalidas: record.totalInvalidas,
        duplicadas: record.totalDuplicadas,
        erros: record.totalErros,
      },
      status: record.status,
      revertidoEm: record.revertidoEm,
      motivoReversao: record.motivoReversao,
      iniciadoPorUsuarioId: record.iniciadoPorUsuarioId,
    });
  }
}
