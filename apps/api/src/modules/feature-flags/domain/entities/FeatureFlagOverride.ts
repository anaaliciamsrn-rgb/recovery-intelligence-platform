import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { FeatureFlagScopeType } from "../value-objects/FeatureFlagScope.js";

export class InvalidFeatureFlagOverrideError extends DomainError {}

export interface FeatureFlagOverrideProps {
  id: string;
  featureFlagId: string;
  escopoTipo: FeatureFlagScopeType;
  escopoValor: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Uma exceção à regra padrão de uma `FeatureFlag` para um tenant, ambiente
 * ou usuário específico — identificado por `escopoTipo` + `escopoValor`
 * (string livre: um `tenantId`, o nome de um ambiente, ou um `userId`).
 * Ver ADR 0031.
 */
export class FeatureFlagOverride {
  private constructor(private props: FeatureFlagOverrideProps) {}

  static create(props: FeatureFlagOverrideProps): FeatureFlagOverride {
    if (props.escopoValor.trim().length === 0) {
      throw new InvalidFeatureFlagOverrideError("Valor do escopo não pode ser vazio");
    }
    return new FeatureFlagOverride(props);
  }

  get id(): string {
    return this.props.id;
  }

  get featureFlagId(): string {
    return this.props.featureFlagId;
  }

  get escopoTipo(): FeatureFlagScopeType {
    return this.props.escopoTipo;
  }

  get escopoValor(): string {
    return this.props.escopoValor;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  atualizarAtivo(ativo: boolean, now: Date): void {
    this.props.ativo = ativo;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<FeatureFlagOverrideProps> {
    return { ...this.props };
  }
}
