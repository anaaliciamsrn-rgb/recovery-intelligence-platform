import { DomainError } from "../../../../domain/errors/DomainError.js";
import { ConfidenceScore } from "../../../../domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import type { DossieFonte } from "../../../dossie/domain/value-objects/DossieFonte.js";
import type { ClasseRisco } from "../../../classification/domain/value-objects/RiskScore.js";
import type { EvidenciaChangeInput, SimulationChange } from "../value-objects/SimulationChange.js";

export class InvalidSimulationChangeError extends DomainError {}

const FONTE_PARA_CAMPO: Record<DossieFonte, keyof DossieEvidencias> = {
  PGFN: "pgfn",
  DATAJUD: "dataJud",
  RECEITA_FEDERAL: "receitaFederal",
  PORTAL_TRANSPARENCIA: "portalTransparencia",
  CENPROT: "cenprot",
};

export interface AppliedOverrides {
  classe: ClasseRisco;
  confianca: ConfidenceScore;
}

/**
 * Aplica mudanças hipotéticas de evidência sobre uma cópia em memória de
 * `DossieEvidencias` — nunca sobre o Dossiê real, nunca persiste nada.
 * Também aplica overrides diretos de classificação/confiança, depois que a
 * classificação já foi recalculada a partir das evidências modificadas.
 * Ver ADR 0023.
 */
export class SimulationChangeApplier {
  static applyEvidenceChanges(
    evidenciasOriginais: Readonly<DossieEvidencias>,
    changes: SimulationChange[],
    now: Date,
  ): DossieEvidencias {
    let evidencias: DossieEvidencias = { ...evidenciasOriginais };

    for (const change of changes) {
      if (change.tipo !== "EVIDENCIA") continue;
      const campo = FONTE_PARA_CAMPO[change.fonte];
      evidencias = { ...evidencias, [campo]: this.buildEvidence(change, now) };
    }

    return evidencias;
  }

  static applyOverrides(
    classeAtual: ClasseRisco,
    confiancaAtual: ConfidenceScore,
    changes: SimulationChange[],
  ): AppliedOverrides {
    let classe = classeAtual;
    let confianca = confiancaAtual;

    for (const change of changes) {
      if (change.tipo === "CLASSIFICACAO_OVERRIDE") classe = change.valor;
      if (change.tipo === "CONFIANCA_OVERRIDE") confianca = ConfidenceScore.create(change.valor);
    }

    return { classe, confianca };
  }

  private static buildEvidence(change: EvidenciaChangeInput, now: Date): Evidence<unknown> {
    if (change.acao === "REMOVER") {
      return Evidence.naoConsultada({ fonte: change.fonte });
    }

    const confidenceScore = ConfidenceScore.create(change.confidenceScore ?? 1);

    switch (change.status) {
      case "ENCONTRADO":
        return Evidence.encontrada({
          valor: change.valor,
          fonte: change.fonte,
          dataConsulta: now,
          confidenceScore,
        });
      case "NAO_ENCONTRADO":
        return Evidence.naoEncontrada({ fonte: change.fonte, dataConsulta: now, confidenceScore });
      case "ERRO_CONSULTA":
        return Evidence.comErro({
          fonte: change.fonte,
          dataConsulta: now,
          motivoErro: change.motivoErro ?? "Erro simulado",
        });
      default:
        throw new InvalidSimulationChangeError(
          `"status" é obrigatório quando "acao" é "SUBSTITUIR" (fonte: ${change.fonte})`,
        );
    }
  }
}
