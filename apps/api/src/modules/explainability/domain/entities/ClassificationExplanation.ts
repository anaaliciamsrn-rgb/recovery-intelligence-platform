import type { ConfidenceScore } from "../../../../domain/value-objects/ConfidenceScore.js";
import type {
  ClasseRisco,
  RiskScore,
} from "../../../classification/domain/value-objects/RiskScore.js";
import type { DecisionTimelineEvent } from "../value-objects/DecisionTimelineEvent.js";
import type { FatorExplicado } from "../value-objects/FatorExplicado.js";
import type { RecomendacaoResumo } from "../value-objects/RecomendacaoResumo.js";

export interface ClassificationExplanationProps {
  dossieId: string;
  geradoEm: Date;
  score: RiskScore;
  classe: ClasseRisco;
  confianca: ConfidenceScore;
  justificativaGeral: string;
  fatores: FatorExplicado[];
  recomendacoes: RecomendacaoResumo[];
  timeline: DecisionTimelineEvent[];
}

/**
 * Estrutura pronta para auditoria: o mesmo resultado de
 * `ClassificarDossieUseCase` (ADR 0016), com cada fator ligado à sua
 * evidência real, mais a cadeia de decisão observável até aqui. Computado a
 * cada chamada, nunca persistido — mesma decisão stateless de
 * `ClassificacaoResultado`/`PromptContext`. Ver ADR 0020.
 */
export class ClassificationExplanation {
  private constructor(private readonly props: ClassificationExplanationProps) {}

  static create(props: ClassificationExplanationProps): ClassificationExplanation {
    return new ClassificationExplanation(props);
  }

  get dossieId(): string {
    return this.props.dossieId;
  }

  get geradoEm(): Date {
    return this.props.geradoEm;
  }

  get score(): RiskScore {
    return this.props.score;
  }

  get classe(): ClasseRisco {
    return this.props.classe;
  }

  get confianca(): ConfidenceScore {
    return this.props.confianca;
  }

  get justificativaGeral(): string {
    return this.props.justificativaGeral;
  }

  get fatores(): FatorExplicado[] {
    return [...this.props.fatores];
  }

  get recomendacoes(): RecomendacaoResumo[] {
    return [...this.props.recomendacoes];
  }

  get timeline(): DecisionTimelineEvent[] {
    return [...this.props.timeline];
  }
}
