export type CaseStatus =
  "ABERTO" | "EM_ANDAMENTO" | "AGUARDANDO_RETORNO" | "NEGOCIACAO" | "RESOLVIDO" | "CANCELADO";

export const CaseStatus = {
  ABERTO: "ABERTO",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  AGUARDANDO_RETORNO: "AGUARDANDO_RETORNO",
  NEGOCIACAO: "NEGOCIACAO",
  RESOLVIDO: "RESOLVIDO",
  CANCELADO: "CANCELADO",
} as const satisfies Record<string, CaseStatus>;

/**
 * Transições válidas fixas — `RESOLVIDO`/`CANCELADO` são terminais (sem
 * saída). Um motor de workflow configurável mais geral existe desde a
 * Etapa 8 (`modules/workflow`, ADR 0027) como alternativa para fluxos
 * customizados; esta tabela fixa continua sendo a validação padrão do
 * ciclo de vida do Case, nunca substituída. Ver ADR 0026.
 */
export const TRANSICOES_VALIDAS: Record<CaseStatus, CaseStatus[]> = {
  ABERTO: ["EM_ANDAMENTO", "CANCELADO"],
  EM_ANDAMENTO: ["AGUARDANDO_RETORNO", "NEGOCIACAO", "RESOLVIDO", "CANCELADO"],
  AGUARDANDO_RETORNO: ["EM_ANDAMENTO", "NEGOCIACAO", "CANCELADO"],
  NEGOCIACAO: ["EM_ANDAMENTO", "RESOLVIDO", "CANCELADO"],
  RESOLVIDO: [],
  CANCELADO: [],
};
