import { randomBytes, randomUUID } from "node:crypto";
import type { IIdGenerator } from "../../application/ports/IIdGenerator.js";

const SECURE_TOKEN_BYTES = 32; // 256 bits

export class CryptoIdGenerator implements IIdGenerator {
  generateId(): string {
    return randomUUID();
  }

  generateSecureToken(): string {
    return randomBytes(SECURE_TOKEN_BYTES).toString("base64url");
  }
}
