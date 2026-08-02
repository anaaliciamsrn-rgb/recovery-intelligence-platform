import type { CNPJ } from "../value-objects/CNPJ.js";

export interface EmpresaProps {
  id: string;
  cnpj: CNPJ;
  razaoSocial: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sujeito consultado pela plataforma (pessoa jurídica). Deliberadamente sem
 * nenhuma referência a `Pessoa` nesta entidade — vínculos societários (QSA)
 * são consulta futura, a ser modelada como sua própria feature quando
 * existir, não como campo especulativo aqui. Ver ADR 0011.
 */
export class Empresa {
  private constructor(private readonly props: EmpresaProps) {}

  static create(props: EmpresaProps): Empresa {
    return new Empresa(props);
  }

  get id(): string {
    return this.props.id;
  }

  get cnpj(): CNPJ {
    return this.props.cnpj;
  }

  get razaoSocial(): string {
    return this.props.razaoSocial;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<EmpresaProps> {
    return { ...this.props };
  }
}
