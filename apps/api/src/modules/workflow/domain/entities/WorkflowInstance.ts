export interface WorkflowInstanceProps {
  id: string;
  workflowDefinitionId: string;
  /** Referência solta (ex.: um `Case.id`) — sem `@relation`, mesmo padrão de toda a plataforma. */
  referenciaId: string;
  estadoAtual: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Uma execução em andamento de uma `WorkflowDefinition`. Ver ADR 0027. */
export class WorkflowInstance {
  private constructor(private props: WorkflowInstanceProps) {}

  static iniciar(input: {
    id: string;
    workflowDefinitionId: string;
    referenciaId: string;
    estadoInicial: string;
    now: Date;
  }): WorkflowInstance {
    return new WorkflowInstance({
      id: input.id,
      workflowDefinitionId: input.workflowDefinitionId,
      referenciaId: input.referenciaId,
      estadoAtual: input.estadoInicial,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static create(props: WorkflowInstanceProps): WorkflowInstance {
    return new WorkflowInstance(props);
  }

  get id(): string {
    return this.props.id;
  }

  get workflowDefinitionId(): string {
    return this.props.workflowDefinitionId;
  }

  get referenciaId(): string {
    return this.props.referenciaId;
  }

  get estadoAtual(): string {
    return this.props.estadoAtual;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  aplicarTransicao(novoEstado: string, now: Date): void {
    this.props.estadoAtual = novoEstado;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<WorkflowInstanceProps> {
    return { ...this.props };
  }
}
