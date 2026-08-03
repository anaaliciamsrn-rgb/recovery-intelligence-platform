import type {
  CaseFilter,
  CasePage,
  CasePagination,
  ICaseRepository,
} from "../../domain/repositories/ICaseRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../tenant/domain/repositories/ITenantResourceOwnershipRepository.js";

export interface ListCasesInput {
  tenantId: string;
  filter: CaseFilter;
  pagination: CasePagination;
}

const RESOURCE_TYPE_DOSSIE = "Dossie";

/**
 * `GET /cases` — filtros por status/owner/prioridade/dossieId, paginado.
 * **Tenant-scoped (ADR 0037)**: um `Case` não tem `TenantResourceOwnership`
 * próprio — pertence ao tenant do chamador transitivamente através do seu
 * `dossieId` (o Dossiê em si é que carrega a propriedade). Nunca lista
 * Cases de outro tenant.
 */
export class ListCasesUseCase {
  constructor(
    private readonly caseRepository: ICaseRepository,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(input: ListCasesInput): Promise<CasePage> {
    const dossieIds = await this.tenantResourceOwnershipRepository.listResourceIds(
      input.tenantId,
      RESOURCE_TYPE_DOSSIE,
    );
    return this.caseRepository.findManyByDossieIds(dossieIds, input.filter, input.pagination);
  }
}
