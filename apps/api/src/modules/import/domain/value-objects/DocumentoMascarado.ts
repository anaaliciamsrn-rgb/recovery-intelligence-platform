import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidDocumentoMascaradoError extends DomainError {}

const MASCARA_CPF_PGFN = /^\*{3}\.(\d{3})\.(\d{3})-\*{2}$/;

/**
 * Documento parcialmente mascarado por uma fonte externa (hoje só a PGFN,
 * padrão `***.NNN.NNN-**`) — **não é um `CPF`** (`modules/party`), que exige
 * o documento completo e validado por dígito verificador. Este VO valida só
 * a FORMA do mascaramento, nunca alega ser um documento completo, e nunca
 * deveria ser usado para criar/identificar uma `Pessoa` diretamente. Ver
 * ADR 0019.
 */
export class DocumentoMascarado {
  private constructor(
    private readonly raw: string,
    private readonly digitosVisiveisValue: string,
  ) {}

  static create(raw: string): DocumentoMascarado {
    const match = MASCARA_CPF_PGFN.exec(raw.trim());
    if (!match) {
      throw new InvalidDocumentoMascaradoError(`Documento mascarado em formato inesperado: ${raw}`);
    }
    return new DocumentoMascarado(raw.trim(), `${match[1]}${match[2]}`);
  }

  /** Os 6 dígitos visíveis (posições 4-9 do CPF real), sem os grupos mascarados. */
  digitosVisiveis(): string {
    return this.digitosVisiveisValue;
  }

  toString(): string {
    return this.raw;
  }

  equals(other: DocumentoMascarado): boolean {
    return this.raw === other.raw;
  }
}
