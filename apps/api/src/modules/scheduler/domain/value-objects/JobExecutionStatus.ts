export type JobExecutionStatus = "SUCESSO" | "FALHA";

export const JobExecutionStatus = {
  SUCESSO: "SUCESSO",
  FALHA: "FALHA",
} as const satisfies Record<string, JobExecutionStatus>;
