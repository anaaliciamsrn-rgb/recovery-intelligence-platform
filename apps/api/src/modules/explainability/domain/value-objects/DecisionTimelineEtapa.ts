/**
 * As seis etapas fixas da cadeia de decisão que este módulo audita:
 * Dossiê criado → fontes consultadas → dossiê atualizado → classificação →
 * recomendação → prompt. Fechado de propósito — a cadeia em si é a mesma
 * desde a Sprint 6 (ver ADR 0015/0016/0017/0018); este módulo só a observa,
 * nunca a expande. Ver ADR 0020.
 */
export type DecisionTimelineEtapa =
  | "CONSULTA_INICIADA"
  | "FONTES_CONSULTADAS"
  | "DOSSIE_ATUALIZADO"
  | "CLASSIFICACAO_EXECUTADA"
  | "RECOMENDACAO_GERADA"
  | "PROMPT_CRIADO";

export const DecisionTimelineEtapa = {
  CONSULTA_INICIADA: "CONSULTA_INICIADA",
  FONTES_CONSULTADAS: "FONTES_CONSULTADAS",
  DOSSIE_ATUALIZADO: "DOSSIE_ATUALIZADO",
  CLASSIFICACAO_EXECUTADA: "CLASSIFICACAO_EXECUTADA",
  RECOMENDACAO_GERADA: "RECOMENDACAO_GERADA",
  PROMPT_CRIADO: "PROMPT_CRIADO",
} as const satisfies Record<string, DecisionTimelineEtapa>;
