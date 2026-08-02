import { createHash } from "node:crypto";
import type { ITokenHasher } from "../../application/ports/ITokenHasher.js";

export class Sha256TokenHasher implements ITokenHasher {
  hash(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
  }
}
