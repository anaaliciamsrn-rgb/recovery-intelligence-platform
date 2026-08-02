import type { RuleVersionEntry } from "../entities/RuleVersionEntry.js";

export interface IRuleVersionRepository {
  append(entrada: RuleVersionEntry): Promise<void>;
  findByRuleDefinitionId(ruleDefinitionId: string): Promise<RuleVersionEntry[]>;
}
