import type { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import type { ImportRow } from "../../../src/modules/import/domain/entities/ImportRow.js";
import type {
  IImportBatchRepository,
  ImportBatchPage,
  ImportBatchPagination,
} from "../../../src/modules/import/domain/repositories/IImportBatchRepository.js";
import type { IImportRowRepository } from "../../../src/modules/import/domain/repositories/IImportRowRepository.js";
import type { IClock } from "../../../src/modules/import/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/import/application/ports/IIdGenerator.js";
import type {
  IImportSourceParser,
  ParsedImportBatch,
} from "../../../src/modules/import/application/ports/IImportSourceParser.js";
import type {
  IReceitaFederalProvider,
  ReceitaFederalLookupResult,
} from "../../../src/modules/import/application/ports/IReceitaFederalProvider.js";
import type { Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";
import type { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import type { ITenantRepository } from "../../../src/modules/tenant/domain/repositories/ITenantRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../src/modules/tenant/domain/repositories/ITenantResourceOwnershipRepository.js";

export class FakeReceitaFederalProvider implements IReceitaFederalProvider {
  constructor(private result: ReceitaFederalLookupResult = { status: "NAO_ENCONTRADO" }) {}

  async consultar(): Promise<ReceitaFederalLookupResult> {
    return this.result;
  }

  setResult(result: ReceitaFederalLookupResult): void {
    this.result = result;
  }
}

export class FakeImportBatchRepository implements IImportBatchRepository {
  private readonly batchesById = new Map<string, ImportBatch>();

  async findById(id: string): Promise<ImportBatch | null> {
    return this.batchesById.get(id) ?? null;
  }

  async save(batch: ImportBatch): Promise<void> {
    this.batchesById.set(batch.id, batch);
  }

  async count(): Promise<number> {
    return this.batchesById.size;
  }

  async findAll(): Promise<ImportBatch[]> {
    return [...this.batchesById.values()].sort(
      (a, b) => b.iniciadoEm.getTime() - a.iniciadoEm.getTime(),
    );
  }

  async findMany(pagination: ImportBatchPagination): Promise<ImportBatchPage> {
    const todos = await this.findAll();
    const inicio = (pagination.page - 1) * pagination.pageSize;
    return {
      items: todos.slice(inicio, inicio + pagination.pageSize),
      total: todos.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) this.batchesById.delete(id);
  }

  seed(batch: ImportBatch): void {
    this.batchesById.set(batch.id, batch);
  }
}

export class FakeImportRowRepository implements IImportRowRepository {
  private readonly rowsById = new Map<string, ImportRow>();

  async findById(id: string): Promise<ImportRow | null> {
    return this.rowsById.get(id) ?? null;
  }

  async findByImportBatchId(importBatchId: string): Promise<ImportRow[]> {
    return [...this.rowsById.values()].filter((row) => row.importBatchId === importBatchId);
  }

  async findByDocumentoMascarado(documentoMascarado: string): Promise<ImportRow[]> {
    return [...this.rowsById.values()].filter(
      (row) => row.documentoMascarado === documentoMascarado,
    );
  }

  async save(row: ImportRow): Promise<void> {
    this.rowsById.set(row.id, row);
  }

  async saveMany(rows: ImportRow[]): Promise<void> {
    for (const row of rows) this.rowsById.set(row.id, row);
  }

  seed(row: ImportRow): void {
    this.rowsById.set(row.id, row);
  }
}

export class FakeImportSourceParser implements IImportSourceParser {
  constructor(private readonly result: ParsedImportBatch) {}

  parse(): ParsedImportBatch {
    return this.result;
  }
}

export class FakeIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class FakeTenantRepository implements ITenantRepository {
  private readonly tenantsById = new Map<string, Tenant>();

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantsById.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    for (const tenant of this.tenantsById.values()) {
      if (tenant.slug === slug) return tenant;
    }
    return null;
  }

  async save(tenant: Tenant): Promise<void> {
    this.tenantsById.set(tenant.id, tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return [...this.tenantsById.values()];
  }

  seed(tenant: Tenant): void {
    this.tenantsById.set(tenant.id, tenant);
  }
}

export class FakeTenantResourceOwnershipRepository implements ITenantResourceOwnershipRepository {
  private readonly ownerships: TenantResourceOwnership[] = [];

  async save(ownership: TenantResourceOwnership): Promise<void> {
    this.ownerships.push(ownership);
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<TenantResourceOwnership | null> {
    return (
      this.ownerships.find(
        (ownership) =>
          ownership.resourceType === resourceType && ownership.resourceId === resourceId,
      ) ?? null
    );
  }

  async listResourceIds(tenantId: string, resourceType: string): Promise<string[]> {
    return this.ownerships
      .filter(
        (ownership) => ownership.tenantId === tenantId && ownership.resourceType === resourceType,
      )
      .map((ownership) => ownership.resourceId);
  }

  async deleteByTenantAndType(tenantId: string, resourceType: string): Promise<void> {
    const remaining = this.ownerships.filter(
      (ownership) => !(ownership.tenantId === tenantId && ownership.resourceType === resourceType),
    );
    this.ownerships.length = 0;
    this.ownerships.push(...remaining);
  }

  seed(ownership: TenantResourceOwnership): void {
    this.ownerships.push(ownership);
  }
}

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
