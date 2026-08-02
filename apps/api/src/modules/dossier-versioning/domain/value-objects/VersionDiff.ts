export type TipoMudanca = "ADICIONADA" | "REMOVIDA" | "ALTERADA" | "INALTERADA";

export interface EvidenciaDiffEntry {
  fonte: "pgfn" | "dataJud" | "receitaFederal" | "portalTransparencia" | "cenprot";
  tipo: TipoMudanca;
}

export interface FatorDiffEntry {
  nome: string;
  tipo: TipoMudanca;
}

export interface RecomendacaoDiffEntry {
  canal: string;
  tipo: TipoMudanca;
}

export interface ValorComparado<T> {
  anterior: T;
  atual: T;
  mudou: boolean;
}

/**
 * Diferença estrutural entre duas versões de um mesmo Dossiê — a resposta
 * de `GET /dossiers/:id/diff/:v1/:v2` e a base do resumo usado por
 * `TimelineVersionBuilder`. Produzido por `VersionDiffService`, puro, sem
 * I/O. Ver ADR 0022.
 */
export interface VersionDiff {
  dossieId: string;
  versaoAnterior: number;
  versaoAtual: number;
  evidencias: EvidenciaDiffEntry[];
  classificacao: ValorComparado<string>;
  riskScore: ValorComparado<number>;
  confidenceScore: ValorComparado<number>;
  fatores: FatorDiffEntry[];
  recomendacoes: RecomendacaoDiffEntry[];
  promptMudou: boolean;
}
