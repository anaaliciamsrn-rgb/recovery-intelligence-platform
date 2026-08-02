import { IdentityMatchResult } from "../../domain/entities/IdentityMatchResult.js";
import { IdentityMatchScorer } from "../../domain/services/IdentityMatchScorer.js";
import type {
  IdentityResolutionCandidate,
  IdentityResolutionQuery,
  IIdentityResolutionSourceProvider,
} from "../ports/IIdentityResolutionSourceProvider.js";
import type { IIdentityResolutionStrategy } from "../ports/IIdentityResolutionStrategy.js";

export interface ResolveIdentityInput {
  documento: string;
  nome: string | null;
}

/**
 * Orquestra: busca candidatos em todas as fontes registradas, compara cada
 * um contra a query via a estratégia injetada, agrega em score+decisão via
 * `IdentityMatchScorer`, e devolve ordenado por confiança (maior primeiro).
 * Nenhuma fonte concreta nem estratégia sofisticada é conhecida aqui — só os
 * contratos (ver ADR 0013).
 */
export class ResolveIdentityUseCase {
  constructor(
    private readonly sourceProviders: IIdentityResolutionSourceProvider[],
    private readonly strategy: IIdentityResolutionStrategy,
  ) {}

  async execute(input: ResolveIdentityInput): Promise<IdentityMatchResult[]> {
    const query: IdentityResolutionQuery = { documento: input.documento, nome: input.nome };

    const candidatesBySource = await Promise.all(
      this.sourceProviders.map((provider) => provider.findCandidates(query)),
    );
    const candidates = candidatesBySource.flat();

    const results = candidates.map((candidate) => this.toResult(query, candidate));

    return results.sort((a, b) => b.confidenceScore.toNumber() - a.confidenceScore.toNumber());
  }

  private toResult(
    query: IdentityResolutionQuery,
    candidate: IdentityResolutionCandidate,
  ): IdentityMatchResult {
    const signals = this.strategy.compare(query, candidate);
    const { confidenceScore, decision } = IdentityMatchScorer.score(signals);

    return IdentityMatchResult.create({
      candidateId: candidate.id,
      candidateSourceType: candidate.sourceType,
      confidenceScore,
      decision,
      signals,
    });
  }
}
