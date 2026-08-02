/**
 * Rastreia, separadamente do status de ingestão, se já sabemos a qual
 * `Pessoa`/`Empresa` uma linha corresponde. `SEM_CORRESPONDENCIA` é um
 * resultado válido e esperado (não um erro) — significa que a resolução de
 * identidade rodou e não achou ninguém com confiança suficiente, o que é
 * exatamente o que acontece hoje com documentos mascarados sem nenhum
 * cadastro real ainda. Ver ADR 0019.
 */
export type ImportResolutionStatus = "PENDENTE" | "RESOLVIDA" | "SEM_CORRESPONDENCIA";

export const ImportResolutionStatus = {
  PENDENTE: "PENDENTE",
  RESOLVIDA: "RESOLVIDA",
  SEM_CORRESPONDENCIA: "SEM_CORRESPONDENCIA",
} as const satisfies Record<string, ImportResolutionStatus>;
