import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidFeatureFlagError extends DomainError {}

const CHAVE_PATTERN = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

export interface FeatureFlagProps {
  id: string;
  chave: string;
  descricao: string | null;
  ativoPadrao: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Um módulo/funcionalidade que pode ser ativado ou desativado sem deploy —
 * `ativoPadrao` é o valor usado quando nenhum override (tenant/ambiente/
 * usuário — ver `FeatureFlagOverride`) se aplica. Ver ADR 0031.
 */
export class FeatureFlag {
  private constructor(private props: FeatureFlagProps) {}

  static create(props: FeatureFlagProps): FeatureFlag {
    if (!CHAVE_PATTERN.test(props.chave)) {
      throw new InvalidFeatureFlagError(
        `Chave inválida: "${props.chave}" — use apenas letras minúsculas, números, pontos e hífens`,
      );
    }
    return new FeatureFlag(props);
  }

  get id(): string {
    return this.props.id;
  }

  get chave(): string {
    return this.props.chave;
  }

  get descricao(): string | null {
    return this.props.descricao;
  }

  get ativoPadrao(): boolean {
    return this.props.ativoPadrao;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  atualizar(input: { descricao: string | null; ativoPadrao: boolean }, now: Date): void {
    this.props.descricao = input.descricao;
    this.props.ativoPadrao = input.ativoPadrao;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<FeatureFlagProps> {
    return { ...this.props };
  }
}
