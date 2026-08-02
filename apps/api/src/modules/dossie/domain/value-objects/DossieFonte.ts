/**
 * As cinco fontes externas previstas para o Dossiê (ver ADR 0015). Fechado
 * de propósito — cada fonte é um slot nomeado em `Dossie.evidencias`, não
 * uma lista dinâmica. Nenhuma integração real existe ainda para nenhuma
 * delas.
 */
export type DossieFonte =
  "PGFN" | "DATAJUD" | "RECEITA_FEDERAL" | "PORTAL_TRANSPARENCIA" | "CENPROT";

export const DossieFonte = {
  PGFN: "PGFN",
  DATAJUD: "DATAJUD",
  RECEITA_FEDERAL: "RECEITA_FEDERAL",
  PORTAL_TRANSPARENCIA: "PORTAL_TRANSPARENCIA",
  CENPROT: "CENPROT",
} as const satisfies Record<string, DossieFonte>;
