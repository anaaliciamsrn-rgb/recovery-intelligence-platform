/**
 * Enum fechado, definido em código — mesmo padrão de Role/AccountStatus em
 * identity. Qualificações reduzidas às mais comuns do QSA da Receita Federal;
 * ampliar quando a integração real existir (ver ADR 0012).
 */
export type PapelSocietario = "SOCIO" | "ADMINISTRADOR" | "SOCIO_ADMINISTRADOR";

export const PapelSocietario = {
  SOCIO: "SOCIO",
  ADMINISTRADOR: "ADMINISTRADOR",
  SOCIO_ADMINISTRADOR: "SOCIO_ADMINISTRADOR",
} as const satisfies Record<string, PapelSocietario>;
