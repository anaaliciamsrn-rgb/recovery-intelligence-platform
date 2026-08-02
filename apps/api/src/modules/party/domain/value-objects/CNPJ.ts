import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidCnpjError extends DomainError {}

/**
 * Documento de Pessoa Jurídica. Normalizado (só dígitos) e validado pelo
 * algoritmo de dígito verificador mod-11 — não é apenas checagem de formato.
 */
export class CNPJ {
  private constructor(private readonly digits: string) {}

  static create(raw: string): CNPJ {
    const digits = raw.replace(/\D/g, "");

    if (digits.length !== 14 || CNPJ.hasAllSameDigit(digits) || !CNPJ.hasValidCheckDigits(digits)) {
      throw new InvalidCnpjError(`CNPJ inválido: ${raw}`);
    }

    return new CNPJ(digits);
  }

  toString(): string {
    return this.digits;
  }

  equals(other: CNPJ): boolean {
    return this.digits === other.digits;
  }

  private static hasAllSameDigit(digits: string): boolean {
    return digits.split("").every((digit) => digit === digits[0]);
  }

  private static hasValidCheckDigits(digits: string): boolean {
    const firstCheckDigit = CNPJ.computeCheckDigit(
      digits.slice(0, 12),
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    if (firstCheckDigit !== Number(digits[12])) return false;

    const secondCheckDigit = CNPJ.computeCheckDigit(
      digits.slice(0, 13),
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    return secondCheckDigit === Number(digits[13]);
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
