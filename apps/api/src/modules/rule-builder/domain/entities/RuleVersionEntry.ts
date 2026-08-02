import type { RuleCondition } from "../value-objects/RuleCondition.js";

export interface RuleVersionEntryProps {
  id: string;
  ruleDefinitionId: string;
  versao: number;
  nome: string;
  descricao: string | null;
  recurso: string;
  condicoes: RuleCondition[];
  peso: number;
  prioridade: number;
  acao: string;
  ativo: boolean;
  criadoEm: Date;
}

/** Uma entrada imutável do histórico de uma `RuleDefinition` — nunca editada ou apagada depois de criada. Ver ADR 0030. */
export class RuleVersionEntry {
  private constructor(private readonly props: RuleVersionEntryProps) {}

  static create(props: RuleVersionEntryProps): RuleVersionEntry {
    return new RuleVersionEntry(props);
  }

  get id(): string {
    return this.props.id;
  }

  get ruleDefinitionId(): string {
    return this.props.ruleDefinitionId;
  }

  get versao(): number {
    return this.props.versao;
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

  get criadoEm(): Date {
    return this.props.criadoEm;
  }

  toProps(): Readonly<RuleVersionEntryProps> {
    return { ...this.props, condicoes: [...this.props.condicoes] };
  }
}
