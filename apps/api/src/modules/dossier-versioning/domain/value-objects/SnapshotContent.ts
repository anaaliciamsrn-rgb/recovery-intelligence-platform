import type { DirecaoFator } from "../../../classification/domain/value-objects/DirecaoFator.js";
import type { CanalCobranca } from "../../../recommendation/domain/value-objects/CanalCobranca.js";

/**
 * Todo o conteúdo abaixo é plano e já serializado — mesma decisão de
 * `PromptContext` (prompt-builder, ADR 0018): a fronteira de um snapshot é
 * de saída/armazenamento, não precisa expor os tipos de domínio de
 * `dossie`/`classification`/`recommendation`/`prompt-builder`. Ver ADR 0022.
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
}

export interface RecomendacaoSnapshotItem {
  canal: CanalCobranca;
  justificativa: string;
}

export interface PromptSnapshot {
  structured: unknown;
  texto: string;
}

/** O conteúdo hasheável de uma versão — tudo, menos `id`/`versao`/`timestamp`/`usuarioId`/`hash` (ver `SnapshotHashService`). */
export interface SnapshotContent {
  evidencias: DossieEvidenciasSnapshot;
  classificacao: string;
  justificativaGeral: string;
  fatores: FatorSnapshot[];
  recomendacoes: RecomendacaoSnapshotItem[];
  prompt: PromptSnapshot;
  confidenceScore: number;
  riskScore: number;
}
