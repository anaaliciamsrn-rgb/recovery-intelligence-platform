import type { IdentitySourceType } from "../../domain/value-objects/IdentitySourceType.js";

export interface IdentityResolutionQuery {
  documento: string;
  nome: string | null;
}

export interface IdentityResolutionCandidate {
  id: string;
  sourceType: IdentitySourceType;
  documento: string;
  nome: string;
}

/**
 * Contrato de uma fonte capaz de sugerir candidatos para uma query de
 * resolução de identidade. `ResolveIdentityUseCase` recebe uma lista deles —
 * é isso que viabiliza "estrutura para múltiplas fontes" sem o use case
 * conhecer nenhuma fonte concreta. Ver ADR 0013.
 */
export interface IIdentityResolutionSourceProvider {
  readonly sourceType: IdentitySourceType;
  findCandidates(query: IdentityResolutionQuery): Promise<IdentityResolutionCandidate[]>;
}
