import type { VersionSnapshot } from "../../../dossier-versioning/domain/entities/VersionSnapshot.js";
import type {
  AnalyticsSummary,
  ChannelCount,
  FactorCount,
  RiskEntityEntry,
  SourceMetric,
  TemporalDataPoint,
} from "../value-objects/AnalyticsSummary.js";

const TOP_N_MAIOR_RISCO = 5;

const FONTES: (keyof VersionSnapshot["evidencias"])[] = [
  "pgfn",
  "dataJud",
  "receitaFederal",
  "portalTransparencia",
  "cenprot",
];

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return Number((valores.reduce((total, valor) => total + valor, 0) / valores.length).toFixed(4));
}

function periodoDe(timestamp: Date): string {
  return `${timestamp.getUTCFullYear()}-${String(timestamp.getUTCMonth() + 1).padStart(2, "0")}`;
}

function ordenarPorTotalDesc<T extends { total: number }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => b.total - a.total);
}

/**
 * Agrega KPIs de toda a carteira a partir da versão mais recente de cada
 * Dossiê (`snapshotsAtuais`) e do histórico completo de versões
 * (`todasAsVersoes`, só para evolução temporal) — puro, sem I/O. Ver ADR
 * 0025.
 */
export class AnalyticsSummaryBuilder {
  static build(
    snapshotsAtuais: VersionSnapshot[],
    todasAsVersoes: VersionSnapshot[],
    totais: {
      pessoas: number;
      empresas: number;
      importacoes: number;
      nomePorDossieId: Map<string, string>;
    },
  ): AnalyticsSummary {
    const distribuicaoRisco: Record<string, number> = {};
    const canaisPorNome = new Map<string, number>();
    const fatoresPorNome = new Map<string, number>();
    const respondidasPorFonte = new Map<string, number>();

    for (const snapshot of snapshotsAtuais) {
      distribuicaoRisco[snapshot.classificacao] =
        (distribuicaoRisco[snapshot.classificacao] ?? 0) + 1;

      const canalPrincipal = snapshot.recomendacoes[0]?.canal;
      if (canalPrincipal)
        canaisPorNome.set(canalPrincipal, (canaisPorNome.get(canalPrincipal) ?? 0) + 1);

      for (const fator of snapshot.fatores) {
        fatoresPorNome.set(fator.nome, (fatoresPorNome.get(fator.nome) ?? 0) + 1);
      }

      for (const fonte of FONTES) {
        if (snapshot.evidencias[fonte].status !== "NAO_CONSULTADO") {
          respondidasPorFonte.set(fonte, (respondidasPorFonte.get(fonte) ?? 0) + 1);
        }
      }
    }

    const totalDossies = snapshotsAtuais.length;
    const canaisMaisRecomendados: ChannelCount[] = ordenarPorTotalDesc(
      [...canaisPorNome.entries()].map(([canal, total]) => ({ canal, total })),
    );
    const fatoresMaisFrequentes: FactorCount[] = ordenarPorTotalDesc(
      [...fatoresPorNome.entries()].map(([nome, total]) => ({ nome, total })),
    );
    const metricasPorFonte: SourceMetric[] = FONTES.map((fonte) => ({
      fonte,
      percentualRespondida:
        totalDossies > 0
          ? Number((((respondidasPorFonte.get(fonte) ?? 0) / totalDossies) * 100).toFixed(2))
          : 0,
    }));

    return {
      totalPessoas: totais.pessoas,
      totalEmpresas: totais.empresas,
      totalDossiesAnalisados: totalDossies,
      totalImportacoes: totais.importacoes,
      scoreMedio: media(snapshotsAtuais.map((snapshot) => snapshot.riskScore)),
      confiancaMedia: media(snapshotsAtuais.map((snapshot) => snapshot.confidenceScore)),
      distribuicaoRisco,
      canaisMaisRecomendados,
      fatoresMaisFrequentes,
      metricasPorFonte,
      evolucaoTemporal: this.evolucaoTemporal(todasAsVersoes),
      empresasEmMaiorRisco: this.empresasEmMaiorRisco(snapshotsAtuais, totais.nomePorDossieId),
      alertas: this.alertas(snapshotsAtuais, distribuicaoRisco),
    };
  }

  private static empresasEmMaiorRisco(
    snapshotsAtuais: VersionSnapshot[],
    nomePorDossieId: Map<string, string>,
  ): RiskEntityEntry[] {
    return snapshotsAtuais
      .filter((snapshot) => nomePorDossieId.has(snapshot.dossieId))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, TOP_N_MAIOR_RISCO)
      .map((snapshot) => ({
        dossieId: snapshot.dossieId,
        nome: nomePorDossieId.get(snapshot.dossieId)!,
        riskScore: snapshot.riskScore,
        classificacao: snapshot.classificacao,
      }));
  }

  /** Cada alerta é derivado de uma contagem real sobre `snapshotsAtuais` — nunca texto fixo/decorativo. Ver ADR 0037. */
  private static alertas(
    snapshotsAtuais: VersionSnapshot[],
    distribuicaoRisco: Record<string, number>,
  ): string[] {
    const alertas: string[] = [];

    const altoRisco = distribuicaoRisco["ALTO_RISCO"] ?? 0;
    if (altoRisco > 0) {
      alertas.push(
        `${altoRisco} empresa(s) classificada(s) como ALTO_RISCO — revisão recomendada.`,
      );
    }

    const comSancao = snapshotsAtuais.filter(
      (snapshot) => snapshot.evidencias.portalTransparencia.status === "ENCONTRADO",
    ).length;
    if (comSancao > 0) {
      alertas.push(`${comSancao} empresa(s) com sanção ativa no Portal da Transparência.`);
    }

    const comProtesto = snapshotsAtuais.filter(
      (snapshot) => snapshot.evidencias.cenprot.status === "ENCONTRADO",
    ).length;
    if (comProtesto > 0) {
      alertas.push(`${comProtesto} empresa(s) com protesto registrado no CENPROT.`);
    }

    return alertas;
  }

  private static evolucaoTemporal(todasAsVersoes: VersionSnapshot[]): TemporalDataPoint[] {
    const porPeriodo = new Map<string, VersionSnapshot[]>();
    for (const snapshot of todasAsVersoes) {
      const periodo = periodoDe(snapshot.timestamp);
      const lista = porPeriodo.get(periodo) ?? [];
      lista.push(snapshot);
      porPeriodo.set(periodo, lista);
    }

    return [...porPeriodo.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodo, snapshots]) => ({
        periodo,
        scoreMedio: media(snapshots.map((snapshot) => snapshot.riskScore)),
        confiancaMedia: media(snapshots.map((snapshot) => snapshot.confidenceScore)),
        totalVersoes: snapshots.length,
      }));
  }
}
