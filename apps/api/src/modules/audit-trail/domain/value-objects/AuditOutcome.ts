export type AuditOutcome = "SUCESSO" | "FALHA";

export const AuditOutcome = {
  SUCESSO: "SUCESSO",
  FALHA: "FALHA",
} as const satisfies Record<string, AuditOutcome>;
