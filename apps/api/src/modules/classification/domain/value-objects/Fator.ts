import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { DirecaoFator } from "./DirecaoFator.js";

export class InvalidFatorError extends DomainError {}

/**
 * Um fator individual que contribuiu para a classificação — o "porquê" que
 * o Explainable Rule Engine exige. Cada regra (`IClassificationRule`)
 * produz no máximo um `Fator` por Dossiê avaliado; regras que não se
 * aplicam (ex.: evidência ainda `NAO_CONSULTADO`) não produzem fator
 * nenhum, em vez de produzir um fator "neutro" — omissão explícita, não um
 * valor placeholder. Ver ADR 0016.
 */
export interface FatorProps {
  nome: string;
  peso: number;
  direcao: DirecaoFator;
  justificativa: string;
}

export class Fator {
  private constructor(private readonly props: FatorProps) {}

  static create(props: FatorProps): Fator {
    if (props.peso <= 0 || props.peso > 1) {
      throw new InvalidFatorError(`Peso de fator fora do intervalo (0,1]: ${props.peso}`);
    }
    return new Fator(props);
  }

  get nome(): string {
    return this.props.nome;
  }

  get peso(): number {
    return this.props.peso;
  }

  get direcao(): DirecaoFator {
    return this.props.direcao;
  }

  get justificativa(): string {
    return this.props.justificativa;
  }
}
