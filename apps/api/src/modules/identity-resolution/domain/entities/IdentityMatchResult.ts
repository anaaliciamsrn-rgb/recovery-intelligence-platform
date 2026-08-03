import type { ConfidenceScore } from "../value-objects/ConfidenceScore.js";
import type { IdentitySourceType } from "../value-objects/IdentitySourceType.js";
import type { MatchDecision } from "../value-objects/MatchDecision.js";
import type { MatchSignal } from "../value-objects/MatchSignal.js";

export interface IdentityMatchResultProps {
  candidateId: string;
  candidateSourceType: IdentitySourceType;
  candidateNome: string;
  candidateDocumento: string;
  confidenceScore: ConfidenceScore;
  decision: MatchDecision;
  signals: MatchSignal[];
}

/**
 * Resultado computado (não persistido, sem identidade própria) de comparar
 * uma query com um candidato de uma fonte. Nasce e morre dentro de
 * `ResolveIdentityUseCase.execute()` — ver ADR 0013.
 */
export class IdentityMatchResult {
  private constructor(private readonly props: IdentityMatchResultProps) {}

  static create(props: IdentityMatchResultProps): IdentityMatchResult {
    return new IdentityMatchResult(props);
  }

  get candidateId(): string {
    return this.props.candidateId;
  }

  get candidateSourceType(): IdentitySourceType {
    return this.props.candidateSourceType;
  }

  get candidateNome(): string {
    return this.props.candidateNome;
  }

  get candidateDocumento(): string {
    return this.props.candidateDocumento;
  }

  get confidenceScore(): ConfidenceScore {
    return this.props.confidenceScore;
  }

  get decision(): MatchDecision {
    return this.props.decision;
  }

  get signals(): MatchSignal[] {
    return [...this.props.signals];
  }
}
