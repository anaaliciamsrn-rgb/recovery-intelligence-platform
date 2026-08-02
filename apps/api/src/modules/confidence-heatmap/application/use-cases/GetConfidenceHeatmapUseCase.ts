import { AppError } from "../../../../application/errors/AppError.js";
import { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { IVersionSnapshotRepository } from "../../../dossier-versioning/domain/repositories/IVersionSnapshotRepository.js";
import { ConfidenceHeatmapBuilder } from "../../domain/services/ConfidenceHeatmapBuilder.js";
import type { ConfidenceHeatmap } from "../../domain/value-objects/ConfidenceHeatmap.js";

/**
 * Depende de `IVersionSnapshotRepository` (dossier-versioning, ADR 0022)
 * de propósito — "confiança histórica" exige dados reais de histórico, e a
 * única fonte de verdade disso na plataforma são os snapshots. Fabricar
 * histórico para evitar essa dependência seria pior do que a dependência
 * em si. Exceção deliberada ao padrão de independência entre módulos-etapa
 * irmãos — ver ADR 0024.
 */
export class GetConfidenceHeatmapUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly classificarDossieUseCase: ClassificarDossieUseCase,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
  ) {}

  async execute(dossieId: string): Promise<ConfidenceHeatmap> {
    const dossie = await this.dossieRepository.findById(dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const classificacao = await this.classificarDossieUseCase.execute(dossieId);
    const { entradas, fontesAusentes, fontesConflitantes } = ConfidenceHeatmapBuilder.build(
      dossie.evidencias,
      classificacao.fatores,
    );

    const snapshots = await this.versionSnapshotRepository.findByDossieId(dossieId);
    const confiancaHistorica = snapshots.map((snapshot) => ({
      versao: snapshot.versao,
      timestamp: snapshot.timestamp.toISOString(),
      confidenceScore: snapshot.confidenceScore,
    }));

    return {
      dossieId,
      fontes: entradas,
      fontesAusentes,
      fontesConflitantes,
      confiancaAgregada: classificacao.confianca.toNumber(),
      riskScore: classificacao.score.toNumber(),
      classificacao: classificacao.classe,
      confiancaHistorica,
    };
  }
}
