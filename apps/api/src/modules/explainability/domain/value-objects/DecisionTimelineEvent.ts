import type { DecisionTimelineEtapa } from "./DecisionTimelineEtapa.js";

export interface DecisionTimelineEventProps {
  etapa: DecisionTimelineEtapa;
  descricao: string;
  /**
   * `null` quando a etapa nunca aconteceu de fato (ex.: nenhuma fonte
   * externa foi consultada ainda) — nunca um timestamp inventado. Ver ADR
   * 0020: "nenhuma informação pode ser inferida".
   */
  timestamp: Date | null;
}

/** Um marco observável na cadeia de decisão de um Dossiê — ver ADR 0020. */
export class DecisionTimelineEvent {
  private constructor(private readonly props: DecisionTimelineEventProps) {}

  static create(props: DecisionTimelineEventProps): DecisionTimelineEvent {
    return new DecisionTimelineEvent(props);
  }

  get etapa(): DecisionTimelineEtapa {
    return this.props.etapa;
  }

  get descricao(): string {
    return this.props.descricao;
  }

  get timestamp(): Date | null {
    return this.props.timestamp;
  }
}
