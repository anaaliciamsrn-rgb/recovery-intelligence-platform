import type { ImportRow } from "../entities/ImportRow.js";

export interface IImportRowRepository {
  findById(id: string): Promise<ImportRow | null>;
  findByImportBatchId(importBatchId: string): Promise<ImportRow[]>;
  /** Usado na deduplicação entre lotes — considera só linhas já `IMPORTADA`. */
  findByDocumentoMascarado(documentoMascarado: string): Promise<ImportRow[]>;
  save(row: ImportRow): Promise<void>;
  saveMany(rows: ImportRow[]): Promise<void>;
}
