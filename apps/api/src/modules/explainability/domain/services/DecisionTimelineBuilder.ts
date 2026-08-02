import type { DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import { DecisionTimelineEtapa } from "../value-objects/DecisionTimelineEtapa.js";
import { DecisionTimelineEvent } from "../value-objects/DecisionTimelineEvent.js";

export interface DecisionTimelineBuilderInput {
  dossieCreatedAt: Date;
  dossieUpdatedAt: Date;
  evidencias: DossieEvidencias;
  classificacaoExecutadaEm: Date;
  recomendacaoGeradaEm: Date;
  promptCriadoEm: Date;
}

/**
 * Monta a timeline de decisão a partir só de timestamps reais: `createdAt`/
 * `updatedAt` do Dossiê, `dataConsulta` de cada evidência, e o instante em
 * que este próprio use case executou classificação/recomendação/prompt (que
 * é real, não inferido — essas três etapas são recalculadas a cada chamada,
 * ver ADR 0020). "Fontes consultadas" fica `timestamp: null` quando nenhuma
 * fonte tem `dataConsulta` ainda — nunca um valor inventado.
 */
export class DecisionTimelineBuilder {
  static build(input: DecisionTimelineBuilderInput): DecisionTimelineEvent[] {
    const ultimaConsultaEm = this.ultimaDataDeConsulta(input.evidencias);

    return [
      DecisionTimelineEvent.create({
        etapa: DecisionTimelineEtapa.CONSULTA_INICIADA,
        descricao: "Dossiê criado — início da investigação sobre o sujeito",
        timestamp: input.dossieCreatedAt,
      }),
      DecisionTimelineEvent.create({
        etapa: DecisionTimelineEtapa.FONTES_CONSULTADAS,
        descricao:
          ultimaConsultaEm !== null
            ? "Data da consulta mais recente registrada entre as fontes do dossiê"
            : "Nenhuma fonte externa foi consultada ainda",
        timestamp: ultimaConsultaEm,
      }),
      DecisionTimelineEvent.create({
        etapa: DecisionTimelineEtapa.DOSSIE_ATUALIZADO,
        descricao: "Última atualização de evidência registrada no dossiê",
        timestamp: input.dossieUpdatedAt,
      }),
      DecisionTimelineEvent.create({
        etapa: DecisionTimelineEtapa.CLASSIFICACAO_EXECUTADA,
        descricao: "Motor de classificação avaliado sobre o estado atual do dossiê",
        timestamp: input.classificacaoExecutadaEm,
      }),
      DecisionTimelineEvent.create({
        etapa: DecisionTimelineEtapa.RECOMENDACAO_GERADA,
        descricao: "Motor de recomendação avaliado sobre a classificação acima",
        timestamp: input.recomendacaoGeradaEm,
      }),
      DecisionTimelineEvent.create({
        etapa: DecisionTimelineEtapa.PROMPT_CRIADO,
        descricao: "Contexto de prompt montado a partir da classificação e recomendação acima",
        timestamp: input.promptCriadoEm,
      }),
    ];
  }

  private static ultimaDataDeConsulta(evidencias: DossieEvidencias): Date | null {
    const datas = Object.values(evidencias)
      .map((evidencia) => ("dataConsulta" in evidencia ? evidencia.dataConsulta : null))
      .filter((data): data is Date => data !== null);

    if (datas.length === 0) return null;
    return new Date(Math.max(...datas.map((data) => data.getTime())));
  }
}
