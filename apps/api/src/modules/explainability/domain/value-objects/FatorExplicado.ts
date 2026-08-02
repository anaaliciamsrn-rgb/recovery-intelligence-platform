import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { DirecaoFator } from "../../../classification/domain/value-objects/DirecaoFator.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";

export interface FatorExplicadoProps {
  nome: string;
  peso: number;
  direcao: DirecaoFator;
  justificativa: string;
  /** A fonte externa cuja evidência originou este fator — ver `FatorSourceMapper`. */
  fonte: DossieFonte;
  /** A evidência real do Dossiê que a regra leu — nunca uma cópia resumida. */
  evidencia: Evidence<unknown>;
}

/**
 * Um `Fator` (classification, ADR 0016) enriquecido com a fonte e a
 * evidência exatas que o originaram, e o impacto assinado (`peso` com o
 * sinal da direção) — nada aqui é inferido: `fonte`/`evidencia` vêm de
 * `FatorSourceMapper`, que falha explicitamente se não conseguir ligar o
 * fator a uma evidência real. Ver ADR 0020.
 */
export class FatorExplicado {
  private constructor(
    private readonly props: FatorExplicadoProps,
    private readonly impactoCalculado: number,
  ) {}

  static create(props: FatorExplicadoProps): FatorExplicado {
    const impacto = props.direcao === "AUMENTA_RISCO" ? props.peso : -props.peso;
    return new FatorExplicado(props, impacto);
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

  get impacto(): number {
    return this.impactoCalculado;
  }

  get justificativa(): string {
    return this.props.justificativa;
  }

  get fonte(): DossieFonte {
    return this.props.fonte;
  }

  get evidencia(): Evidence<unknown> {
    return this.props.evidencia;
  }
}
