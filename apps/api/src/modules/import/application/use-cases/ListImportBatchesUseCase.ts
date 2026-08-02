import type {
  IImportBatchRepository,
  ImportBatchPage,
  ImportBatchPagination,
} from "../../domain/repositories/IImportBatchRepository.js";

const DEFAULT_PAGE_SIZE = 50;

/** Histórico de importações (Etapa 15, ADR 0034) — todos os lotes, mais recentes primeiro, paginado. */
export class ListImportBatchesUseCase {
  constructor(private readonly importBatchRepository: IImportBatchRepository) {}

  async execute(
    pagination: ImportBatchPagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  ): Promise<ImportBatchPage> {
    return this.importBatchRepository.findMany(pagination);
  }
}
