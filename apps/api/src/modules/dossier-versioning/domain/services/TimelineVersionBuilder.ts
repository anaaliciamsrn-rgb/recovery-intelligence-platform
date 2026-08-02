import type { VersionSnapshot } from "../entities/VersionSnapshot.js";
import type { VersionDiff } from "../value-objects/VersionDiff.js";
import type { VersionTimelineEntry } from "../value-objects/VersionTimelineEntry.js";
import { VersionDiffService } from "./VersionDiffService.js";

const NOME_FONTE: Record<string, string> = {
  pgfn: "PGFN",
  dataJud: "DataJud",
  receitaFederal: "Receita Federal",
  portalTransparencia: "Portal da Transparência",
  cenprot: "CENPROT",
};

const LABEL_FEMININO: Record<string, string> = {
  ADICIONADA: "adicionada",
  REMOVIDA: "removida",
  ALTERADA: "alterada",
};
const LABEL_MASCULINO: Record<string, string> = {
  ADICIONADA: "adicionado",
  REMOVIDA: "removido",
  ALTERADA: "alterado",
};

function resumirDiff(diff: VersionDiff): string[] {
  const linhas: string[] = [];

  for (const entrada of diff.evidencias) {
    linhas.push(
      `Evidência ${NOME_FONTE[entrada.fonte] ?? entrada.fonte} ${LABEL_FEMININO[entrada.tipo]}`,
    );
  }
  if (diff.classificacao.mudou) {
    linhas.push(
      `Classificação de risco mudou de ${diff.classificacao.anterior} para ${diff.classificacao.atual}`,
    );
  }
  if (diff.riskScore.mudou) {
    linhas.push(
      `Score de risco mudou de ${diff.riskScore.anterior.toFixed(2)} para ${diff.riskScore.atual.toFixed(2)}`,
    );
  }
  if (diff.confidenceScore.mudou) {
    linhas.push(
      `Confiança mudou de ${diff.confidenceScore.anterior.toFixed(2)} para ${diff.confidenceScore.atual.toFixed(2)}`,
    );
  }
  for (const entrada of diff.fatores) {
    linhas.push(`Fator "${entrada.nome}" ${LABEL_MASCULINO[entrada.tipo]}`);
  }
  for (const entrada of diff.recomendacoes) {
    linhas.push(`Recomendação ${entrada.canal} ${LABEL_FEMININO[entrada.tipo]}`);
  }
  if (diff.promptMudou) {
    linhas.push("Prompt gerado foi atualizado");
  }

  return linhas;
}

/**
 * Constrói a visão de linha do tempo consumida por `GET /dossiers/:id/history`
 * — leve de propósito (sem o conteúdo completo de cada versão, que fica em
 * `GET /dossiers/:id/history/:version`). A versão 1 nunca tem resumo (não
 * há versão anterior para comparar); as demais reaproveitam
 * `VersionDiffService` contra a versão imediatamente anterior. Ver ADR 0022.
 */
export class TimelineVersionBuilder {
  static build(snapshotsOrdenadosPorVersao: VersionSnapshot[]): VersionTimelineEntry[] {
    return snapshotsOrdenadosPorVersao.map((snapshot, index) => {
      const anterior = index > 0 ? snapshotsOrdenadosPorVersao[index - 1] : undefined;
      const resumoMudancas = anterior
        ? resumirDiff(VersionDiffService.diff(anterior, snapshot))
        : [];

      return {
        versao: snapshot.versao,
        timestamp: snapshot.timestamp,
        usuarioId: snapshot.usuarioId,
        hash: snapshot.hash,
        resumoMudancas,
      };
    });
  }
}
