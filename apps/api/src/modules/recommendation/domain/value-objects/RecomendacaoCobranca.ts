import type { CanalCobranca } from "./CanalCobranca.js";

export interface RecomendacaoCobrancaProps {
  canal: CanalCobranca;
  justificativa: string;
}

/**
 * Uma recomendação individual de abordagem de cobrança. Sempre carrega sua
 * própria justificativa — "toda recomendação deve ser explicável" é
 * garantido pelo tipo, não por convenção (não existe construtor que omita
 * `justificativa`). Ver ADR 0017.
 */
export class RecomendacaoCobranca {
  private constructor(private readonly props: RecomendacaoCobrancaProps) {}

  static create(props: RecomendacaoCobrancaProps): RecomendacaoCobranca {
    return new RecomendacaoCobranca(props);
  }

  get canal(): CanalCobranca {
    return this.props.canal;
  }

  get justificativa(): string {
    return this.props.justificativa;
  }
}
