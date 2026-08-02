import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidMatchSignalError extends DomainError {}

/**
 * Sinal individual observado ao comparar uma query com um candidato (ex.:
 * "documento idêntico", "nome similar"). Não confundir com o Evidence Model
 * genérico da Sprint 5 (`docs/architecture/decisions/0014`) — este é um
 * conceito mais estreito, interno ao motor de resolução de identidade, que
 * nunca é persistido nem exposto a outras features. Um `MatchSignal` é
 * puramente descritivo; quem decide o que fazer com ele é
 * `IdentityMatchScorer`.
 */
export interface MatchSignalProps {
  tipo: string;
  peso: number;
  favoravel: boolean;
  descricao: string;
}

export class MatchSignal {
  private constructor(private readonly props: MatchSignalProps) {}

  static create(props: MatchSignalProps): MatchSignal {
    if (props.peso <= 0 || props.peso > 1) {
      throw new InvalidMatchSignalError(
        `Peso de sinal de match fora do intervalo (0,1]: ${props.peso}`,
      );
    }
    return new MatchSignal(props);
  }

  get tipo(): string {
    return this.props.tipo;
  }

  get peso(): number {
    return this.props.peso;
  }

  get favoravel(): boolean {
    return this.props.favoravel;
  }

  get descricao(): string {
    return this.props.descricao;
  }
}
