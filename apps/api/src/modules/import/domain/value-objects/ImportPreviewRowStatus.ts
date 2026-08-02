export type ImportPreviewRowStatus = "IMPORTAVEL" | "IGNORADA" | "INVALIDA" | "DUPLICADA" | "ERRO";

export const ImportPreviewRowStatus = {
  /** A linha passaria por todas as validações se o lote fosse de fato importado agora. */
  IMPORTAVEL: "IMPORTAVEL",
  IGNORADA: "IGNORADA",
  INVALIDA: "INVALIDA",
  DUPLICADA: "DUPLICADA",
  ERRO: "ERRO",
} as const satisfies Record<string, ImportPreviewRowStatus>;
