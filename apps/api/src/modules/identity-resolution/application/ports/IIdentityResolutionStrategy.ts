import type { MatchSignal } from "../../domain/value-objects/MatchSignal.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
} from "./IIdentityResolutionSourceProvider.js";

/**
 * Contrato do algoritmo de comparação query-candidato. Produz sinais
 * (`MatchSignal[]`), nunca decide sozinho o `ConfidenceScore`/`MatchDecision`
 * final — isso é responsabilidade de `IdentityMatchScorer` (domínio puro).
 * A única implementação nesta fase (`ExactDocumentMatchStrategy`) é
 * deliberadamente trivial — algoritmos sofisticados (fonética, similaridade
 * de nome, etc.) são escopo futuro. Ver ADR 0013.
 */
export interface IIdentityResolutionStrategy {
  compare(query: IdentityResolutionQuery, candidate: IdentityResolutionCandidate): MatchSignal[];
}
