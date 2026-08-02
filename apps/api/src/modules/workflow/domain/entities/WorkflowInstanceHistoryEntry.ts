export interface WorkflowInstanceHistoryEntryProps {
  id: string;
  workflowInstanceId: string;
  de: string;
  para: string;
  gatilho: string;
  timestamp: Date;
}

/** Timeline append-only de transições já aplicadas a uma `WorkflowInstance`. */
export class WorkflowInstanceHistoryEntry {
  private constructor(private readonly props: WorkflowInstanceHistoryEntryProps) {}

  static create(props: WorkflowInstanceHistoryEntryProps): WorkflowInstanceHistoryEntry {
    return new WorkflowInstanceHistoryEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get workflowInstanceId(): string {
    return this.props.workflowInstanceId;
  }

  get de(): string {
    return this.props.de;
  }

  get para(): string {
    return this.props.para;
  }

  get gatilho(): string {
    return this.props.gatilho;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  toProps(): Readonly<WorkflowInstanceHistoryEntryProps> {
    return { ...this.props };
  }
}
