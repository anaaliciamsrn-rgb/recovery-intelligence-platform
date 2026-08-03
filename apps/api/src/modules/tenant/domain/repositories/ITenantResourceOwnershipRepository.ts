import type { TenantResourceOwnership } from "../entities/TenantResourceOwnership.js";

export interface ITenantResourceOwnershipRepository {
  save(ownership: TenantResourceOwnership): Promise<void>;
  findByResource(resourceType: string, resourceId: string): Promise<TenantResourceOwnership | null>;
  /**
   * Busca inversa — todo `resourceId` de um tipo que pertence a um tenant.
   * Usado por qualquer módulo que precise listar/filtrar seus próprios
   * recursos por tenant (ex.: `analytics`, `import`) sem duplicar a coluna
   * `tenantId` na tabela de origem. Ver ADR 0037.
   */
  listResourceIds(tenantId: string, resourceType: string): Promise<string[]>;
  /** Usado só por `ResetTenantImportedDataUseCase` (import, ADR 0037) depois de já ter apagado os recursos em si — nunca chamado sozinho (deixaria o recurso "sem dono" sem de fato removê-lo). */
  deleteByTenantAndType(tenantId: string, resourceType: string): Promise<void>;
}
