import type { ConfidenceScore } from "../../../../domain/value-objects/ConfidenceScore.js";
import type { ClasseRisco, RiskScore } from "../value-objects/RiskScore.js";
import type { Fator } from "../value-objects/Fator.js";

export interface ClassificacaoResultadoProps {
  dossieId: string;
  score: RiskScore;
  classe: ClasseRisco;
  fatores: Fator[];
  justificativaGeral: string;
  confianca: ConfidenceScore;
}

/**
 * Resultado computado (não persistido) de classificar um Dossiê — nasce e
 * morre dentro de `ClassificarDossieUseCase.execute()`, mesmo padrão de
 * `IdentityMatchResult` (ADR 0013). `score` (risco) e `confianca` (segurança
 * dessa conclusão) são dimensões independentes, nunca combinadas num único
 * número. Ver ADR 0016.
 */
export class ClassificacaoResultado {
  private constructor(private readonly props: ClassificacaoResultadoProps) {}

  static create(props: ClassificacaoResultadoProps): ClassificacaoResultado {
    return new ClassificacaoResultado(props);
  }

  get dossieId(): string {
    return this.props.dossieId;
  }

  get score(): RiskScore {
    return this.props.score;
  }

  get classe(): ClasseRisco {
    return this.props.classe;
  }

  get fatores(): Fator[] {
    return [...this.props.fatores];
  }

  get justificativaGeral(): string {
    return this.props.justificativaGeral;
  }

  get confianca(): ConfidenceScore {
    return this.props.confianca;
  }
}
