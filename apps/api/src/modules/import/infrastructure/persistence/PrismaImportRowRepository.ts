import type { PrismaClient, ImportRow as PrismaImportRowRecord } from "@prisma/client";
import { ImportRow } from "../../domain/entities/ImportRow.js";
import type { ImportResolutionStatus } from "../../domain/value-objects/ImportResolutionStatus.js";
import type { ImportRowStatus } from "../../domain/value-objects/ImportRowStatus.js";
import type { IImportRowRepository } from "../../domain/repositories/IImportRowRepository.js";

export class PrismaImportRowRepository implements IImportRowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<ImportRow | null> {
    const record = await this.prisma.importRow.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByImportBatchId(importBatchId: string): Promise<ImportRow[]> {
    const records = await this.prisma.importRow.findMany({
      where: { importBatchId },
      orderBy: { numeroLinha: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByDocumentoMascarado(documentoMascarado: string): Promise<ImportRow[]> {
    const records = await this.prisma.importRow.findMany({ where: { documentoMascarado } });
    return records.map((record) => this.toDomain(record));
  }

  async save(row: ImportRow): Promise<void> {
    await this.persistOne(row);
  }

  async saveMany(rows: ImportRow[]): Promise<void> {
    for (const row of rows) {
      await this.persistOne(row);
    }
  }

  private async persistOne(row: ImportRow): Promise<void> {
    const props = row.toProps();

    const data = {
      importBatchId: props.importBatchId,
      numeroLinha: props.numeroLinha,
      status: props.status,
      resolutionStatus: props.resolutionStatus,
      pessoaId: props.pessoaId,
      dossieId: props.dossieId,
      documentoMascarado: props.documentoMascarado,
      nome: props.nome,
      nomeFantasia: props.nomeFantasia,
      valorTotal: props.valorTotal !== null ? props.valorTotal.toString() : null,
      valorDividaSelecionada:
        props.valorDividaSelecionada !== null ? props.valorDividaSelecionada.toString() : null,
      naturezaDivida: props.naturezaDivida,
      motivo: props.motivo,
    };

    await this.prisma.importRow.upsert({
      where: { id: props.id },
      create: { id: props.id, ...data },
      update: data,
    });
  }

  private toDomain(record: PrismaImportRowRecord): ImportRow {
    return ImportRow.create({
      id: record.id,
      importBatchId: record.importBatchId,
      numeroLinha: record.numeroLinha,
      status: record.status as ImportRowStatus,
      resolutionStatus: record.resolutionStatus as ImportResolutionStatus,
      pessoaId: record.pessoaId,
      dossieId: record.dossieId,
      documentoMascarado: record.documentoMascarado,
      nome: record.nome,
      nomeFantasia: record.nomeFantasia,
      valorTotal: record.valorTotal !== null ? Number(record.valorTotal) : null,
      valorDividaSelecionada:
        record.valorDividaSelecionada !== null ? Number(record.valorDividaSelecionada) : null,
      naturezaDivida: record.naturezaDivida,
      motivo: record.motivo,
      createdAt: record.createdAt,
    });
  }
}
