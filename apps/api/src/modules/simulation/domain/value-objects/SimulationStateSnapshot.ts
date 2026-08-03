import type { DirecaoFator } from "../../../classification/domain/value-objects/DirecaoFator.js";
import type { CanalCobranca } from "../../../recommendation/domain/value-objects/CanalCobranca.js";

/**
 * Todo o conteúdo abaixo é plano e já serializado — mesma decisão de
 * `PromptContext` (prompt-builder, ADR 0018) e `SnapshotContent`
 * (dossier-versioning, ADR 0022), duplicada aqui de propósito: `simulation`
 * é um módulo independente, não deveria depender de `dossier-versioning`
 * (um módulo-etapa irmão, não uma fundação como `classification`) só para
 * reaproveitar uma forma de dados. Ver ADR 0023.
 */
export interface EvidenciaSnapshot {
  status: "ENCONTRADO" | "NAO_ENCONTRADO" | "NAO_CONSULTADO" | "ERRO_CONSULTA";
  valor?: unknown;
  dataConsulta?: string;
  confidenceScore?: number;
  motivoErro?: string;
}

export interface DossieEvidenciasSnapshot {
  pgfn: EvidenciaSnapshot;
  dataJud: EvidenciaSnapshot;
  receitaFederal: EvidenciaSnapshot;
  portalTransparencia: EvidenciaSnapshot;
  cenprot: EvidenciaSnapshot;
}

export interface FatorSnapshot {
  nome: string;
  peso: number;
  direcao: DirecaoFator;
  justificativa: string;
  fonte: string;
}

export interface RecomendacaoSnapshotItem {
  canal: CanalCobranca;
  justificativa: string;
}

export interface PromptSnapshot {
  structured: unknown;
  texto: string;
}

/** O estado completo computado — "antes" ou "depois" — de uma simulação. */
export interface SimulationStateSnapshot {
  evidencias: DossieEvidenciasSnapshot;
  classificacao: string;
  justificativaGeral: string;
  fatores: FatorSnapshot[];
  confidenceScore: number;
  riskScore: number;
  recomendacoes: RecomendacaoSnapshotItem[];
  prompt: PromptSnapshot;
}
