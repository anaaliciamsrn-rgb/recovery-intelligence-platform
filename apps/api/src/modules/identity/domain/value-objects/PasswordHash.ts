import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidPasswordHashError extends DomainError {}

/**
 * Wrapper do hash Argon2 já calculado. O domínio só sabe que "isso parece um
 * hash Argon2" (validação estrutural leve) — quem sabe calcular/verificar é
 * a porta `IPasswordHasher` (infrastructure), o domínio nunca importa a lib.
 */
export class PasswordHash {
  private constructor(private readonly value: string) {}

  static fromHash(hash: string): PasswordHash {
    if (!hash.startsWith("$argon2")) {
      throw new InvalidPasswordHashError("Hash de senha em formato inesperado");
    }

    return new PasswordHash(hash);
  }

  toString(): string {
    return this.value;
  }
}
