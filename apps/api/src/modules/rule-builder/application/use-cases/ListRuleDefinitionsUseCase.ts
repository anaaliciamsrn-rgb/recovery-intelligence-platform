import type {
  IRuleDefinitionRepository,
  RuleDefinitionFilter,
  RuleDefinitionPage,
  RuleDefinitionPagination,
} from "../../domain/repositories/IRuleDefinitionRepository.js";

const DEFAULT_PAGE_SIZE = 50;

export class ListRuleDefinitionsUseCase {
  constructor(private readonly ruleDefinitionRepository: IRuleDefinitionRepository) {}

  async execute(
    filter: RuleDefinitionFilter = {},
    pagination: RuleDefinitionPagination = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
  ): Promise<RuleDefinitionPage> {
    return this.ruleDefinitionRepository.findMany(filter, pagination);
  }
}
