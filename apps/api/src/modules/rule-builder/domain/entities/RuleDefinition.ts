import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { RuleCondition } from "../value-objects/RuleCondition.js";

export class InvalidRuleDefinitionError extends DomainError {}

export interface RuleDefinitionProps {
  id: string;
  nome: string;
  descricao: string | null;
  recurso: string;
  condicoes: RuleCondition[];
  peso: number;
  prioridade: number;
  acao: string;
  ativo: boolean;
  versaoAtual: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleDefinitionRevisionInput {
  nome: string;
  descricao: string | null;
  condicoes: RuleCondition[];
  peso: number;
  prioridade: number;
  acao: string;
  ativo: boolean;
}

/**
 * Uma regra configurável — peso, prioridade, condições e ação vêm
 * inteiramente de dados (esta entidade); criar/alterar uma regra nunca
 * exige uma classe nova, ver ADR 0030. `versaoAtual` avança a cada
 * `revisar()`; cada revisão gera uma `RuleVersionEntry` própria (histórico
 * append-only, mantido pelo use case, não por esta entidade).
 */
export class RuleDefinition {
  private constructor(private props: RuleDefinitionProps) {}

  static create(props: RuleDefinitionProps): RuleDefinition {
    RuleDefinition.validar(
      props.nome,
      props.recurso,
      props.condicoes,
      props.peso,
      props.prioridade,
    );
    return new RuleDefinition(props);
  }

  private static validar(
    nome: string,
    recurso: string,
    condicoes: RuleCondition[],
    peso: number,
    prioridade: number,
  ): void {
    if (nome.trim().length === 0) {
      throw new InvalidRuleDefinitionError("Nome da regra não pode ser vazio");
    }
    if (recurso.trim().length === 0) {
      throw new InvalidRuleDefinitionError("Recurso da regra não pode ser vazio");
    }
    if (condicoes.length === 0) {
      throw new InvalidRuleDefinitionError("Regra precisa de ao menos uma condição");
    }
    if (peso < 0) {
      throw new InvalidRuleDefinitionError("Peso da regra não pode ser negativo");
    }
    if (!Number.isInteger(prioridade) || prioridade < 0) {
      throw new InvalidRuleDefinitionError(
        "Prioridade da regra precisa ser um inteiro não-negativo",
      );
    }
  }

  get id(): string {
    return this.props.id;
  }

  get nome(): string {
    return this.props.nome;
  }

  get descricao(): string | null {
    return this.props.descricao;
  }

  get recurso(): string {
    return this.props.recurso;
  }

  get condicoes(): RuleCondition[] {
    return [...this.props.condicoes];
  }

  get peso(): number {
    return this.props.peso;
  }

  get prioridade(): number {
    return this.props.prioridade;
  }

  get acao(): string {
    return this.props.acao;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get versaoAtual(): number {
    return this.props.versaoAtual;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** Aplica uma nova revisão e avança `versaoAtual` — nunca reescreve uma versão já existente. */
  revisar(input: RuleDefinitionRevisionInput, now: Date): void {
    RuleDefinition.validar(
      input.nome,
      this.props.recurso,
      input.condicoes,
      input.peso,
      input.prioridade,
    );
    this.props.nome = input.nome;
    this.props.descricao = input.descricao;
    this.props.condicoes = [...input.condicoes];
    this.props.peso = input.peso;
    this.props.prioridade = input.prioridade;
    this.props.acao = input.acao;
    this.props.ativo = input.ativo;
    this.props.versaoAtual += 1;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<RuleDefinitionProps> {
    return { ...this.props, condicoes: [...this.props.condicoes] };
  }
}
