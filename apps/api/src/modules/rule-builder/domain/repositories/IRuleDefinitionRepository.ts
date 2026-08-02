import type { RuleDefinition } from "../entities/RuleDefinition.js";

export interface RuleDefinitionFilter {
  recurso?: string;
  ativo?: boolean;
}

export interface RuleDefinitionPagination {
  page: number;
  pageSize: number;
}

export interface RuleDefinitionPage {
  items: RuleDefinition[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IRuleDefinitionRepository {
  findById(id: string): Promise<RuleDefinition | null>;
  /** Sem paginação: usado por `EvaluateRulesUseCase`, que precisa de todas as regras ativas do recurso. */
  findAll(filter?: RuleDefinitionFilter): Promise<RuleDefinition[]>;
  findMany(
    filter: RuleDefinitionFilter,
    pagination: RuleDefinitionPagination,
  ): Promise<RuleDefinitionPage>;
  save(regra: RuleDefinition): Promise<void>;
}
