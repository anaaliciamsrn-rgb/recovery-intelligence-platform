import { createHash } from "node:crypto";
import type { SnapshotContent } from "../value-objects/SnapshotContent.js";

/** Ordena recursivamente as chaves de um valor JSON-serializável, para que a mesma informação produza sempre a mesma string, independente da ordem de inserção original. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (value !== null && typeof value === "object") {
    const entradasOrdenadas = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((chave) => [chave, canonicalize((value as Record<string, unknown>)[chave])] as const);
    return Object.fromEntries(entradasOrdenadas);
  }

  return value;
}

/**
 * Calcula um hash SHA-256 determinístico do conteúdo de uma versão —
 * `SnapshotContent`, nunca `id`/`versao`/`timestamp`/`usuarioId` (esses
 * identificam "quando/quem", não "o quê"; dois conteúdos idênticos em
 * versões diferentes devem produzir o mesmo hash). Puro e sem I/O: mesma
 * entrada sempre produz a mesma saída, nenhuma chamada de rede/disco — por
 * isso vive no domínio, mesmo usando `node:crypto` (decisão equivalente à
 * de outros serviços de domínio puramente computacionais do projeto, ex.
 * `ClassificacaoRiscoScorer`). Ver ADR 0022.
 */
export class SnapshotHashService {
  static compute(content: SnapshotContent): string {
    const canonico = JSON.stringify(canonicalize(content));
    return createHash("sha256").update(canonico).digest("hex");
  }
}
