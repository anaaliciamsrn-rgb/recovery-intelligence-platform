import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidCpfError extends DomainError {}

/**
 * Documento de Pessoa Física. Normalizado (só dígitos) e validado pelo
 * algoritmo de dígito verificador mod-11 — não é apenas checagem de formato.
 */
export class CPF {
  private constructor(private readonly digits: string) {}

  static create(raw: string): CPF {
    const digits = raw.replace(/\D/g, "");

    if (digits.length !== 11 || CPF.hasAllSameDigit(digits) || !CPF.hasValidCheckDigits(digits)) {
      throw new InvalidCpfError(`CPF inválido: ${raw}`);
    }

    return new CPF(digits);
  }

  toString(): string {
    return this.digits;
  }

  equals(other: CPF): boolean {
    return this.digits === other.digits;
  }

  private static hasAllSameDigit(digits: string): boolean {
    return digits.split("").every((digit) => digit === digits[0]);
  }

  private static hasValidCheckDigits(digits: string): boolean {
    const firstCheckDigit = CPF.computeCheckDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    if (firstCheckDigit !== Number(digits[9])) return false;

    const secondCheckDigit = CPF.computeCheckDigit(
      digits.slice(0, 10),
      [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    return secondCheckDigit === Number(digits[10]);
  }

  private static computeCheckDigit(base: string, weights: number[]): number {
    const sum = weights.reduce(
      (total, weight, index) => total + weight * Number(base[index] ?? 0),
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  }
}
