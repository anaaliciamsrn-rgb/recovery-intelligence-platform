/**
 * Contratos de resposta da API — espelham os tipos reais do backend
 * (ver apps/api/src/modules/*), duplicados aqui deliberadamente (mesmo
 * princípio de independência de módulo já usado no backend: o frontend não
 * deveria importar tipos internos de apps/api). Campos representativos, não
 * exaustivos.
 */

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
}

export type CaseStatus =
  "ABERTO" | "EM_ANDAMENTO" | "AGUARDANDO_RETORNO" | "NEGOCIACAO" | "RESOLVIDO" | "CANCELADO";
export type CasePriority = "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";

export interface CaseSummary {
  id: string;
  dossieId: string;
  status: CaseStatus;
  ownerId: string | null;
  priority: CasePriority;
  tags: string[];
  proximaAcao: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ImportBatchStatus = "CONCLUIDO" | "REVERTIDO";

export interface ImportBatchSummary {
  id: string;
  fonte: string;
  nomeArquivo: string;
  iniciadoEm: string;
  finalizadoEm: string | null;
  totalLinhas: number;
  contagens: {
    importadas: number;
    ignoradas: number;
    invalidas: number;
    duplicadas: number;
    erros: number;
  };
  status: ImportBatchStatus;
  revertidoEm: string | null;
  motivoReversao: string | null;
}

export type ScheduledJobStatus = "PENDENTE" | "EXECUTANDO" | "CONCLUIDO" | "MORTO";

export interface ScheduledJobSummary {
  id: string;
  nome: string;
  tipo: string;
  status: ScheduledJobStatus;
  agendadoPara: string;
  tentativas: number;
  maxTentativas: number;
  ultimoErro: string | null;
}

export interface ConfidenceHeatmapSource {
  fonte: string;
  status: "ENCONTRADO" | "NAO_ENCONTRADO" | "NAO_CONSULTADO" | "ERRO_CONSULTA";
  confidenceScore: number | null;
  contribuicaoPercentual: number;
}

export interface HistoricalConfidenceEntry {
  versao: number;
  timestamp: string;
  confidenceScore: number;
}

export interface ConfidenceHeatmap {
  dossieId: string;
  classificacao: string;
  riskScore: number;
  fontes: ConfidenceHeatmapSource[];
  fontesAusentes: string[];
  fontesConflitantes: string[];
  confiancaAgregada: number;
  confiancaHistorica: HistoricalConfidenceEntry[];
}

export interface DossieVersionEntry {
  versao: number;
  timestamp: string;
  usuarioId: string | null;
  hash: string;
  resumoMudancas: string[];
}

export interface AuditEventSummary {
  id: string;
  timestamp: string;
  usuarioId: string | null;
  entidade: string;
  entidadeId: string;
  tipo: string;
  outcome: "SUCESSO" | "FALHA";
  mensagem: string | null;
}

export interface PessoaSummary {
  id: string;
  cpf: string;
  nome: string;
}

export interface EmpresaSummary {
  id: string;
  cnpj: string;
  razaoSocial: string;
}

export interface ParticipacaoSocietariaSummary {
  id: string;
  pessoaId: string;
  empresaId: string;
  papel: string;
  percentualParticipacao: number | null;
  dataEntrada: string | null;
  dataSaida: string | null;
}
