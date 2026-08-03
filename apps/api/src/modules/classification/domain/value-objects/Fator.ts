import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import type { DirecaoFator } from "./DirecaoFator.js";

export class InvalidFatorError extends DomainError {}

/**
 * Um fator individual que contribuiu para a classificação — o "porquê" que
 * o Explainable Rule Engine exige. Cada regra (`IClassificationRule`)
 * produz no máximo um `Fator` por Dossiê avaliado; regras que não se
 * aplicam (ex.: evidência ainda `NAO_CONSULTADO`) não produzem fator
 * nenhum, em vez de produzir um fator "neutro" — omissão explícita, não um
 * valor placeholder. Ver ADR 0016.
 *
 * `fonte` é a fonte de evidência que originou o fator, declarada pela
 * própria regra que o produziu (ADR 0037) — antes disso, três módulos
 * diferentes (`ConfidenceHeatmapBuilder`, `FatorSourceMapper`,
 * `SimulationImpactAnalyzer`) mantinham a mesma tabela "nome do fator →
 * fonte" como gambiarra, que ficava obsoleta silenciosamente sempre que uma
 * regra nova era adicionada em só um dos três lugares.
 */
export interface FatorProps {
  nome: string;
  peso: number;
  direcao: DirecaoFator;
  justificativa: string;
  fonte: DossieFonte;
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

  get fonte(): DossieFonte {
    return this.props.fonte;
  }
}
