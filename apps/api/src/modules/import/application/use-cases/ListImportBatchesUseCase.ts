import type {
  IImportBatchRepository,
  ImportBatchPage,
  ImportBatchPagination,
} from "../../domain/repositories/IImportBatchRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../tenant/domain/repositories/ITenantResourceOwnershipRepository.js";

const DEFAULT_PAGE_SIZE = 50;
const RESOURCE_TYPE_IMPORT_BATCH = "ImportBatch";

/**
 * Histórico de importações (Etapa 15, ADR 0034) — mais recentes primeiro,
 * paginado. **Tenant-scoped (ADR 0037)**: só lotes registrados como
 * propriedade do tenant do chamador via `TenantResourceOwnership` — filtro e
 * paginação em memória sobre `findAll()`, mesma ressalva de escala já
 * documentada para `findAll()`/`findMany` em `party`/`import` (ADR 0019),
 * aceitável para o volume de demonstração desta fase.
 */
export class ListImportBatchesUseCase {
  constructor(
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(
    tenantId: string,
    pagination: ImportBatchPagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  ): Promise<ImportBatchPage> {
    const allowedIds = new Set(
      await this.tenantResourceOwnershipRepository.listResourceIds(
        tenantId,
        RESOURCE_TYPE_IMPORT_BATCH,
      ),
    );

    const todosOsLotes = await this.importBatchRepository.findAll();
    const lotesDoTenant = todosOsLotes.filter((batch) => allowedIds.has(batch.id));

    const start = (pagination.page - 1) * pagination.pageSize;
    const items = lotesDoTenant.slice(start, start + pagination.pageSize);

    return {
      items,
      total: lotesDoTenant.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }
}
