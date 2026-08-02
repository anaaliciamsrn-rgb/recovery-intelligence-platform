export type ScheduledJobStatus = "PENDENTE" | "EXECUTANDO" | "CONCLUIDO" | "MORTO";

export const ScheduledJobStatus = {
  PENDENTE: "PENDENTE",
  EXECUTANDO: "EXECUTANDO",
  CONCLUIDO: "CONCLUIDO",
  /** Fila-morta — excedeu `maxTentativas`, não será mais reprocessado automaticamente. */
  MORTO: "MORTO",
} as const satisfies Record<string, ScheduledJobStatus>;
