import type { Case } from "../entities/Case.js";
import type { CasePriority } from "../value-objects/CasePriority.js";
import type { CaseStatus } from "../value-objects/CaseStatus.js";

export interface CaseFilter {
  status?: CaseStatus;
  ownerId?: string;
  priority?: CasePriority;
  dossieId?: string;
}

export interface CasePagination {
  page: number;
  pageSize: number;
}

export interface CasePage {
  items: Case[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ICaseRepository {
  findById(id: string): Promise<Case | null>;
  save(caso: Case): Promise<void>;
  findMany(filter: CaseFilter, pagination: CasePagination): Promise<CasePage>;
  /**
   * Mesmo filtro de `findMany`, restrito a um conjunto de `dossieId`s —
   * usado por `ListCasesUseCase` (ADR 0037) para tenant-scoping: um Case
   * não tem `TenantResourceOwnership` próprio, pertence ao tenant
   * transitivamente através do seu Dossiê.
   */
  findManyByDossieIds(
    dossieIds: string[],
    filter: CaseFilter,
    pagination: CasePagination,
  ): Promise<CasePage>;
}
