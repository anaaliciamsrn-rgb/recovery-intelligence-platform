/**
 * Fontes conhecidas de identidade. `INTERNAL` é a única com provider real
 * nesta fase (`PartyIdentitySourceProvider`, ver ADR 0013) — as demais são a
 * "estrutura para múltiplas fontes" pedida na Sprint 4: existem como tipo
 * fechado desde já, mas nenhuma integração externa foi feita (mesma lista
 * de fontes prevista para o Dossiê na Sprint 6, ver ADR 0015).
 */
export type IdentitySourceType =
  "INTERNAL" | "RECEITA_FEDERAL" | "PGFN" | "DATAJUD" | "PORTAL_TRANSPARENCIA" | "CENPROT";

export const IdentitySourceType = {
  INTERNAL: "INTERNAL",
  RECEITA_FEDERAL: "RECEITA_FEDERAL",
  PGFN: "PGFN",
  DATAJUD: "DATAJUD",
  PORTAL_TRANSPARENCIA: "PORTAL_TRANSPARENCIA",
  CENPROT: "CENPROT",
} as const satisfies Record<string, IdentitySourceType>;
