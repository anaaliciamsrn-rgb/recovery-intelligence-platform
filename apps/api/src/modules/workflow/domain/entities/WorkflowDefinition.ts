import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { WorkflowTransition } from "../value-objects/WorkflowTransition.js";

export class InvalidWorkflowDefinitionError extends DomainError {}

export interface WorkflowDefinitionProps {
  id: string;
  nome: string;
  descricao: string | null;
  estados: string[];
  estadoInicial: string;
  ativo: boolean;
  transicoes: WorkflowTransition[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Um fluxo configurável — estados e transições vêm inteiramente de dados
 * (esta entidade + `WorkflowTransition[]`), nunca de código. Criar um fluxo
 * novo é inserir uma linha nova, nunca uma classe nova. Ver ADR 0027.
 */
export class WorkflowDefinition {
  private constructor(private readonly props: WorkflowDefinitionProps) {}

  static create(props: WorkflowDefinitionProps): WorkflowDefinition {
    if (!props.estados.includes(props.estadoInicial)) {
      throw new InvalidWorkflowDefinitionError(
        `Estado inicial "${props.estadoInicial}" não está na lista de estados`,
      );
    }
    for (const transicao of props.transicoes) {
      if (!props.estados.includes(transicao.de) || !props.estados.includes(transicao.para)) {
        throw new InvalidWorkflowDefinitionError(
          `Transição "${transicao.de} → ${transicao.para}" referencia estado inexistente`,
        );
      }
    }
    return new WorkflowDefinition(props);
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

  get estados(): string[] {
    return [...this.props.estados];
  }

  get estadoInicial(): string {
    return this.props.estadoInicial;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get transicoes(): WorkflowTransition[] {
    return [...this.props.transicoes];
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<WorkflowDefinitionProps> {
    return {
      ...this.props,
      estados: [...this.props.estados],
      transicoes: [...this.props.transicoes],
    };
  }
}
