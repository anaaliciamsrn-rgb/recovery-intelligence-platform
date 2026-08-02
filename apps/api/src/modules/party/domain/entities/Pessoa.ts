import type { CPF } from "../value-objects/CPF.js";

export interface PessoaProps {
  id: string;
  cpf: CPF;
  nome: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sujeito consultado pela plataforma (pessoa física) — não confundir com
 * `User` (o ator que autentica, em modules/identity). Ver ADR 0011.
 */
export class Pessoa {
  private constructor(private readonly props: PessoaProps) {}

  static create(props: PessoaProps): Pessoa {
    return new Pessoa(props);
  }

  get id(): string {
    return this.props.id;
  }

  get cpf(): CPF {
    return this.props.cpf;
  }

  get nome(): string {
    return this.props.nome;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<PessoaProps> {
    return { ...this.props };
  }
}
