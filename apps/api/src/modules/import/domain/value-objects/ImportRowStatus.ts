/**
 * Status de ingestão de uma linha — responde só "a linha foi processada
 * corretamente?", nunca "sabemos a quem ela pertence?" (isso é
 * `ImportResolutionStatus`, um conceito separado). Os cinco valores exigidos:
 * importada, ignorada, inválida, duplicada, erro.
 */
export type ImportRowStatus = "IMPORTADA" | "IGNORADA" | "INVALIDA" | "DUPLICADA" | "ERRO";

export const ImportRowStatus = {
  IMPORTADA: "IMPORTADA",
  IGNORADA: "IGNORADA",
  INVALIDA: "INVALIDA",
  DUPLICADA: "DUPLICADA",
  ERRO: "ERRO",
} as const satisfies Record<string, ImportRowStatus>;
