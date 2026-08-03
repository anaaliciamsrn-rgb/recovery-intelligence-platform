export interface ChannelCount {
  canal: string;
  total: number;
}

export interface FactorCount {
  nome: string;
  total: number;
}

export interface SourceMetric {
  fonte: string;
  percentualRespondida: number;
}

export interface TemporalDataPoint {
  periodo: string;
  scoreMedio: number;
  confiancaMedia: number;
  totalVersoes: number;
}

export interface RiskEntityEntry {
  dossieId: string;
  nome: string;
  riskScore: number;
  classificacao: string;
}

/**
 * KPIs agregados de toda a carteira — computados sobre a versão mais
 * recente de cada Dossiê já versionado (dossier-versioning, ADR 0022),
 * nunca reexecutando classificação/recomendação em massa. Ver ADR 0025.
 */
export interface AnalyticsSummary {
  totalPessoas: number;
  totalEmpresas: number;
  totalDossiesAnalisados: number;
  totalImportacoes: number;
  scoreMedio: number;
  confiancaMedia: number;
  distribuicaoRisco: Record<string, number>;
  canaisMaisRecomendados: ChannelCount[];
  fatoresMaisFrequentes: FactorCount[];
  metricasPorFonte: SourceMetric[];
  evolucaoTemporal: TemporalDataPoint[];
  /** Top 5 por `riskScore` desc, só entre Dossiês cujo nome do sujeito pôde ser resolvido — ver ADR 0037. */
  empresasEmMaiorRisco: RiskEntityEntry[];
  /** Alertas derivados de contagens reais (nunca texto fixo/decorativo) — ver ADR 0037. */
  alertas: string[];
}
