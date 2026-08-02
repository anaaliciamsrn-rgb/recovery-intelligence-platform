export type ImportBatchStatus = "CONCLUIDO" | "REVERTIDO";

export const ImportBatchStatus = {
  CONCLUIDO: "CONCLUIDO",
  /** Reversão lógica — o lote nunca tem suas `ImportRow` apagadas, ver ADR 0034. */
  REVERTIDO: "REVERTIDO",
} as const satisfies Record<string, ImportBatchStatus>;
