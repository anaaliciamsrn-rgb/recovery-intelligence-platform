import { DomainError } from "../../../../domain/errors/DomainError.js";
import type { PapelSocietario } from "../value-objects/PapelSocietario.js";

export class InvalidParticipacaoSocietariaError extends DomainError {}

export interface ParticipacaoSocietariaProps {
  id: string;
  /** Referência solta (sem objeto `Pessoa`) — mesmo padrão de `Session.userId` em identity. */
  pessoaId: string;
  /** Referência solta (sem objeto `Empresa`) — ver ADR 0012. */
  empresaId: string;
  papel: PapelSocietario;
  percentualParticipacao: number | null;
  dataEntrada: Date | null;
  dataSaida: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Representa o vínculo societário entre uma `Pessoa` e uma `Empresa` —
 * agregado próprio, não um campo dentro de nenhuma das duas entidades (ver
 * ADR 0012). Preparação para futura consulta ao QSA da Receita Federal;
 * nenhuma integração externa acontece aqui.
 */
export class ParticipacaoSocietaria {
  private constructor(private props: ParticipacaoSocietariaProps) {}

  static create(props: ParticipacaoSocietariaProps): ParticipacaoSocietaria {
    if (props.percentualParticipacao !== null) {
      if (props.percentualParticipacao <= 0 || props.percentualParticipacao > 100) {
        throw new InvalidParticipacaoSocietariaError(
          `Percentual de participação inválido: ${props.percentualParticipacao}`,
        );
      }
    }

    if (props.dataEntrada && props.dataSaida && props.dataSaida < props.dataEntrada) {
      throw new InvalidParticipacaoSocietariaError(
        "Data de saída não pode ser anterior à data de entrada",
      );
    }

    return new ParticipacaoSocietaria(props);
  }

  get id(): string {
    return this.props.id;
  }

  get pessoaId(): string {
    return this.props.pessoaId;
  }

  get empresaId(): string {
    return this.props.empresaId;
  }

  get papel(): PapelSocietario {
    return this.props.papel;
  }

  get percentualParticipacao(): number | null {
    return this.props.percentualParticipacao;
  }

  get dataEntrada(): Date | null {
    return this.props.dataEntrada;
  }

  get dataSaida(): Date | null {
    return this.props.dataSaida;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  estaAtiva(): boolean {
    return this.props.dataSaida === null;
  }

  encerrar(dataSaida: Date, now: Date): void {
    if (this.props.dataEntrada && dataSaida < this.props.dataEntrada) {
      throw new InvalidParticipacaoSocietariaError(
        "Data de saída não pode ser anterior à data de entrada",
      );
    }

    this.props.dataSaida = dataSaida;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<ParticipacaoSocietariaProps> {
    return { ...this.props };
  }
}
