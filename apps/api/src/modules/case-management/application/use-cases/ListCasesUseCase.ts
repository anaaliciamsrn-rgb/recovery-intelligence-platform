import type {
  CaseFilter,
  CasePage,
  CasePagination,
  ICaseRepository,
} from "../../domain/repositories/ICaseRepository.js";

export interface ListCasesInput {
  filter: CaseFilter;
  pagination: CasePagination;
}

/** `GET /cases` — filtros por status/owner/prioridade/dossieId, paginado. */
export class ListCasesUseCase {
  constructor(private readonly caseRepository: ICaseRepository) {}

  async execute(input: ListCasesInput): Promise<CasePage> {
    return this.caseRepository.findMany(input.filter, input.pagination);
  }
}
