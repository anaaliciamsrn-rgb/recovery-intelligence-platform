import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidEmailError extends DomainError {}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Auto-validado e normalizado (trim + lowercase) — igualdade sempre por valor normalizado. */
export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalized)) {
      throw new InvalidEmailError(`Email inválido: ${raw}`);
    }

    return new Email(normalized);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
