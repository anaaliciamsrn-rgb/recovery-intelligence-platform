export type CasePriority = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export const CasePriority = {
  BAIXA: "BAIXA",
  MEDIA: "MEDIA",
  ALTA: "ALTA",
  URGENTE: "URGENTE",
} as const satisfies Record<string, CasePriority>;
