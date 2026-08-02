import argon2 from "argon2";
import type { IPasswordHasher } from "../../application/ports/IPasswordHasher.js";
import type { Env } from "../../shared/config/env.js";

/** Argon2id, parâmetros configuráveis via env (nunca hardcoded) — ver ADR 0010. */
export class Argon2PasswordHasher implements IPasswordHasher {
  constructor(private readonly env: Env) {}

  async hash(plainText: string): Promise<string> {
    return argon2.hash(plainText, {
      type: argon2.argon2id,
      memoryCost: this.env.ARGON2_MEMORY_COST_KB,
      timeCost: this.env.ARGON2_TIME_COST,
      parallelism: this.env.ARGON2_PARALLELISM,
    });
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      // Hash malformado/incompatível — trata como "não bateu", nunca propaga.
      return false;
    }
  }
}
