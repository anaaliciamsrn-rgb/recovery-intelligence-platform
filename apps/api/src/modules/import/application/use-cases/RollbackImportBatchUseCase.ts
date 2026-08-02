import { AppError } from "../../../../application/errors/AppError.js";
import {
  InvalidImportBatchTransitionError,
  type ImportBatch,
} from "../../domain/entities/ImportBatch.js";
import type { IImportBatchRepository } from "../../domain/repositories/IImportBatchRepository.js";
import type { IClock } from "../ports/IClock.js";

export interface RollbackImportBatchInput {
  importBatchId: string;
  motivo: string;
}

/**
 * Reversão lógica de um lote já concluído — nunca apaga `ImportRow`
 * (auditabilidade total). Ver ADR 0034 para a limitação: não recalcula
 * deduplicação entre lotes nem desfaz `Pessoa`/`Dossiê` eventualmente
 * criados por `ResolveImportRowIdentityUseCase`.
 */
export class RollbackImportBatchUseCase {
  constructor(
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly clock: IClock,
  ) {}

  async execute(input: RollbackImportBatchInput): Promise<ImportBatch> {
    const batch = await this.importBatchRepository.findById(input.importBatchId);
    if (!batch) {
      throw new AppError("NOT_FOUND", "Lote de importação não encontrado");
    }

    try {
      batch.reverter(input.motivo, this.clock.now());
    } catch (error) {
      if (error instanceof InvalidImportBatchTransitionError) {
        throw new AppError("CONFLICT", error.message);
      }
      throw error;
    }

    await this.importBatchRepository.save(batch);
    return batch;
  }
}
