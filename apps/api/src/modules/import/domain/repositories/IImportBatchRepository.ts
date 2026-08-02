import type { ImportBatch } from "../entities/ImportBatch.js";

export interface ImportBatchPagination {
  page: number;
  pageSize: number;
}

export interface ImportBatchPage {
  items: ImportBatch[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IImportBatchRepository {
  findById(id: string): Promise<ImportBatch | null>;
  save(batch: ImportBatch): Promise<void>;
  /** Total de lotes de importação já criados — usado por `analytics` (ADR 0025) para estatísticas agregadas. */
  count(): Promise<number>;
  /** Histórico de importações (Etapa 15, ADR 0034) — mais recentes primeiro. */
  findAll(): Promise<ImportBatch[]>;
  findMany(pagination: ImportBatchPagination): Promise<ImportBatchPage>;
}
