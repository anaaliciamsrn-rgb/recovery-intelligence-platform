import { AppError } from "../../../../application/errors/AppError.js";
import type { Evidence } from "../../../../domain/value-objects/Evidence.js";
import type { IClassificationRule } from "../../../classification/application/ports/IClassificationRule.js";
import { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import { Dossie, type DossieEvidencias } from "../../../dossie/domain/entities/Dossie.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { DossieSubjectType } from "../../../dossie/domain/value-objects/DossieSubjectType.js";
import type { IEmpresaRepository } from "../../../party/domain/repositories/IEmpresaRepository.js";
import type { IPessoaRepository } from "../../../party/domain/repositories/IPessoaRepository.js";
import type { PromptContext } from "../../../prompt-builder/domain/models/PromptContext.js";
import { PromptBuilder } from "../../../prompt-builder/domain/services/PromptBuilder.js";
import type {
  IRecommendationRule,
  RecommendationRuleInput,
} from "../../../recommendation/application/ports/IRecommendationRule.js";
import { RecomendacaoCobranca } from "../../../recommendation/domain/value-objects/RecomendacaoCobranca.js";
import {
  InvalidSimulationChangeError,
  SimulationChangeApplier,
} from "../../domain/services/SimulationChangeApplier.js";
import { SimulationDiffService } from "../../domain/services/SimulationDiffService.js";
import { SimulationImpactAnalyzer } from "../../domain/services/SimulationImpactAnalyzer.js";
import { SimulationSummaryBuilder } from "../../domain/services/SimulationSummaryBuilder.js";
import type { SimulationChange } from "../../domain/value-objects/SimulationChange.js";
import type {
  SimulationDeltas,
  SimulationResult,
} from "../../domain/value-objects/SimulationResult.js";
import type {
  DossieEvidenciasSnapshot,
  EvidenciaSnapshot,
  RecomendacaoSnapshotItem,
  SimulationStateSnapshot,
} from "../../domain/value-objects/SimulationStateSnapshot.js";
import type { IClock } from "../ports/IClock.js";
import type { IInMemoryDossieRepositoryFactory } from "../ports/IInMemoryDossieRepositoryFactory.js";

const JUSTIFICATIVA_FALLBACK =
  "Nenhuma regra específica se aplicou a esta combinação de risco e confiança — cobrança amigável recomendada como abordagem padrão segura.";

export interface RunSimulationInput {
  dossieId: string;
  changes: SimulationChange[];
}

/**
 * Motor de simulação: duplica o Dossiê em memória, aplica as mudanças
 * hipotéticas, e reexecuta classificação/recomendação/prompt duas vezes
 * (antes e depois) — sem nunca persistir nada. A classificação real é
 * reaproveitada sem modificação (`ClassificarDossieUseCase` ligado a um
 * `InMemoryDossieRepository`, nunca ao repositório real); a recomendação e
 * o prompt são recompostos aqui porque `GerarRecomendacoesUseCase`/
 * `BuildPromptUseCase` sempre recalculam a classificação por conta própria
 * e não aceitam um resultado já sobrescrito — necessário para que
 * `CONFIANCA_OVERRIDE`/`CLASSIFICACAO_OVERRIDE` de fato se propaguem até a
 * recomendação e o prompt. Ver ADR 0023.
 */
export class RunSimulationUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
    private readonly classificationRules: IClassificationRule[],
    private readonly recommendationRules: IRecommendationRule[],
    private readonly clock: IClock,
    private readonly inMemoryDossieRepositoryFactory: IInMemoryDossieRepositoryFactory,
  ) {}

  async execute(input: RunSimulationInput): Promise<SimulationResult> {
    const dossieReal = await this.dossieRepository.findById(input.dossieId);
    if (!dossieReal) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const subject = await this.resolveSubject(dossieReal.subjectType, dossieReal.subjectId);
    const now = this.clock.now();

    const antes = await this.buildState(dossieReal, subject, now, []);

    const dossieSimulado = Dossie.create({
      ...dossieReal.toProps(),
      evidencias: this.applyEvidenceChanges(dossieReal.evidencias, input.changes, now),
    });
    const depois = await this.buildState(dossieSimulado, subject, now, input.changes);

    const deltas: SimulationDeltas = {
      riskScoreDelta: depois.riskScore - antes.riskScore,
      confidenceScoreDelta: depois.confidenceScore - antes.confidenceScore,
      classificacaoMudou: antes.classificacao !== depois.classificacao,
      recomendacaoMudou: antes.recomendacoes[0]?.canal !== depois.recomendacoes[0]?.canal,
      promptMudou: antes.prompt.texto !== depois.prompt.texto,
    };

    return {
      dossieId: input.dossieId,
      changes: input.changes,
      antes,
      depois,
      deltas,
      comparacao: {
        score: { old: antes.riskScore, new: depois.riskScore, difference: deltas.riskScoreDelta },
        classificacao: {
          old: antes.classificacao,
          new: depois.classificacao,
          difference: deltas.classificacaoMudou,
        },
        confianca: {
          old: antes.confidenceScore,
          new: depois.confidenceScore,
          difference: deltas.confidenceScoreDelta,
        },
        recomendacoes: {
          old: antes.recomendacoes,
          new: depois.recomendacoes,
          difference: this.diffCanais(antes.recomendacoes, depois.recomendacoes),
        },
        prompt: {
          old: antes.prompt.texto,
          new: depois.prompt.texto,
          difference: deltas.promptMudou,
        },
      },
      mudancasDetectadas: SimulationDiffService.detectarMudancas(antes, depois),
      impactos: SimulationImpactAnalyzer.analyze(input.changes, antes, depois),
      resumo: SimulationSummaryBuilder.build(input.changes, antes, depois),
    };
  }

  private async buildState(
    dossie: Dossie,
    subject: PromptContext["subject"],
    now: Date,
    changes: SimulationChange[],
  ): Promise<SimulationStateSnapshot> {
    const classificarDossieUseCase = new ClassificarDossieUseCase(
      this.inMemoryDossieRepositoryFactory.create(dossie),
      this.classificationRules,
    );
    const classificacaoBase = await classificarDossieUseCase.execute(dossie.id);

    const { classe, confianca } = SimulationChangeApplier.applyOverrides(
      classificacaoBase.classe,
      classificacaoBase.confianca,
      changes,
    );

    const fatores = classificacaoBase.fatores.map((fator) => ({
      nome: fator.nome,
      peso: fator.peso,
      direcao: fator.direcao,
      justificativa: fator.justificativa,
    }));

    const recommendationInput: RecommendationRuleInput = {
      classe,
      score: classificacaoBase.score.toNumber(),
      confianca: confianca.toNumber(),
      nivelConfianca: confianca.nivel(),
    };
    const recomendacoes = this.avaliarRecomendacoes(recommendationInput);

    const promptContext: PromptContext = {
      dossieId: dossie.id,
      geradoEm: now.toISOString(),
      subject,
      classificacao: {
        classe,
        score: classificacaoBase.score.toNumber(),
        confianca: confianca.toNumber(),
        nivelConfianca: confianca.nivel(),
        justificativaGeral: classificacaoBase.justificativaGeral,
        fatores,
      },
      recomendacoes: recomendacoes.map((recomendacao) => ({
        canal: recomendacao.canal,
        justificativa: recomendacao.justificativa,
      })),
    };

    return {
      evidencias: this.toEvidenciasSnapshot(dossie.evidencias),
      classificacao: classe,
      justificativaGeral: classificacaoBase.justificativaGeral,
      fatores,
      confidenceScore: confianca.toNumber(),
      riskScore: classificacaoBase.score.toNumber(),
      recomendacoes: recomendacoes.map((recomendacao) => ({
        canal: recomendacao.canal,
        justificativa: recomendacao.justificativa,
      })),
      prompt: {
        structured: PromptBuilder.toStructuredJson(promptContext),
        texto: PromptBuilder.toTextPrompt(promptContext),
      },
    };
  }

  private applyEvidenceChanges(
    evidencias: Readonly<DossieEvidencias>,
    changes: SimulationChange[],
    now: Date,
  ): DossieEvidencias {
    try {
      return SimulationChangeApplier.applyEvidenceChanges(evidencias, changes, now);
    } catch (error) {
      if (error instanceof InvalidSimulationChangeError) {
        throw new AppError("VALIDATION", error.message);
      }
      throw error;
    }
  }

  private avaliarRecomendacoes(input: RecommendationRuleInput): RecomendacaoCobranca[] {
    const recomendacoes = this.recommendationRules
      .map((rule) => rule.avaliar(input))
      .filter((recomendacao): recomendacao is RecomendacaoCobranca => recomendacao !== null);

    return recomendacoes.length > 0
      ? recomendacoes
      : [
          RecomendacaoCobranca.create({
            canal: "COBRANCA_AMIGAVEL",
            justificativa: JUSTIFICATIVA_FALLBACK,
          }),
        ];
  }

  private async resolveSubject(
    subjectType: DossieSubjectType,
    subjectId: string,
  ): Promise<PromptContext["subject"]> {
    if (subjectType === "PESSOA") {
      const pessoa = await this.pessoaRepository.findById(subjectId);
      if (!pessoa) {
        throw new AppError("INTERNAL", "Pessoa referenciada pelo dossiê não foi encontrada");
      }
      return { tipo: "PESSOA", id: pessoa.id, documento: pessoa.cpf.toString(), nome: pessoa.nome };
    }

    const empresa = await this.empresaRepository.findById(subjectId);
    if (!empresa) {
      throw new AppError("INTERNAL", "Empresa referenciada pelo dossiê não foi encontrada");
    }
    return {
      tipo: "EMPRESA",
      id: empresa.id,
      documento: empresa.cnpj.toString(),
      nome: empresa.razaoSocial,
    };
  }

  private toEvidenciasSnapshot(evidencias: Readonly<DossieEvidencias>): DossieEvidenciasSnapshot {
    return {
      pgfn: this.toEvidenciaSnapshot(evidencias.pgfn),
      dataJud: this.toEvidenciaSnapshot(evidencias.dataJud),
      receitaFederal: this.toEvidenciaSnapshot(evidencias.receitaFederal),
      portalTransparencia: this.toEvidenciaSnapshot(evidencias.portalTransparencia),
      cenprot: this.toEvidenciaSnapshot(evidencias.cenprot),
    };
  }

  private toEvidenciaSnapshot(evidence: Evidence<unknown>): EvidenciaSnapshot {
    switch (evidence.status) {
      case "ENCONTRADO":
        return {
          status: evidence.status,
          valor: evidence.valor,
          dataConsulta: evidence.dataConsulta.toISOString(),
          confidenceScore: evidence.confidenceScore.toNumber(),
        };
      case "NAO_ENCONTRADO":
        return {
          status: evidence.status,
          dataConsulta: evidence.dataConsulta.toISOString(),
          confidenceScore: evidence.confidenceScore.toNumber(),
        };
      case "NAO_CONSULTADO":
        return { status: evidence.status };
      case "ERRO_CONSULTA":
        return {
          status: evidence.status,
          dataConsulta: evidence.dataConsulta.toISOString(),
          motivoErro: evidence.motivoErro,
        };
    }
  }

  private diffCanais(
    antes: RecomendacaoSnapshotItem[],
    depois: RecomendacaoSnapshotItem[],
  ): { adicionados: string[]; removidos: string[] } {
    const canaisAntes = new Set(antes.map((recomendacao) => recomendacao.canal));
    const canaisDepois = new Set(depois.map((recomendacao) => recomendacao.canal));
    return {
      adicionados: [...canaisDepois].filter((canal) => !canaisAntes.has(canal)),
      removidos: [...canaisAntes].filter((canal) => !canaisDepois.has(canal)),
    };
  }
}
