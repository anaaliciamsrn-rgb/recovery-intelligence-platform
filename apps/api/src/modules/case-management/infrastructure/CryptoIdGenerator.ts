import { randomUUID } from "node:crypto";
import type { IIdGenerator } from "../application/ports/IIdGenerator.js";

export class CryptoIdGenerator implements IIdGenerator {
  generateId(): string {
    return randomUUID();
  }
}
