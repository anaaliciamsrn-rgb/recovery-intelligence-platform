import { DomainError } from "../../../../domain/errors/DomainError.js";

export class WeakPasswordError extends DomainError {}

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;

/**
 * Senha em texto puro — existe só durante o fluxo de definição/troca de
 * senha, nunca é persistida (some depois de virar `PasswordHash`).
 *
 * Política deliberadamente sem regra de complexidade obrigatória (maiúscula/
 * número/símbolo) nem expiração forçada — segue NIST 800-63B / OWASP ASVS
 * atual, que abandonou essas regras. `MAX_LENGTH` existe para não permitir
 * DoS de CPU jogando strings gigantes no Argon2.
 */
export class PlainPassword {
  private constructor(private readonly value: string) {}

  static create(raw: string): PlainPassword {
    if (raw.length < MIN_LENGTH) {
      throw new WeakPasswordError(`A senha deve ter pelo menos ${MIN_LENGTH} caracteres`);
    }

    if (raw.length > MAX_LENGTH) {
      throw new WeakPasswordError(`A senha deve ter no máximo ${MAX_LENGTH} caracteres`);
    }

    return new PlainPassword(raw);
  }

  reveal(): string {
    return this.value;
  }

  /** Nunca serializar a senha puro — defesa extra contra um log/JSON.stringify acidental. */
  toJSON(): string {
    return "[REDACTED]";
  }
}
