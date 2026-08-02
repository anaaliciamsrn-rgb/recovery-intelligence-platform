import type { IVersionSnapshotRepository } from "../../../dossier-versioning/domain/repositories/IVersionSnapshotRepository.js";
import type { IImportBatchRepository } from "../../../import/domain/repositories/IImportBatchRepository.js";
import type { IEmpresaRepository } from "../../../party/domain/repositories/IEmpresaRepository.js";
import type { IPessoaRepository } from "../../../party/domain/repositories/IPessoaRepository.js";
import { AnalyticsSummaryBuilder } from "../../domain/services/AnalyticsSummaryBuilder.js";
import type { AnalyticsSummary } from "../../domain/value-objects/AnalyticsSummary.js";

/**
 * Depende diretamente de `dossier-versioning`/`party`/`import` — exceção
 * deliberada ao padrão de independência entre módulos-etapa (mesma
 * justificativa de `confidence-heatmap`, ADR 0024): analytics agrega dados
 * reais já existentes, nunca fabrica números. Ver ADR 0025.
 */
export class GetAnalyticsSummaryUseCase {
  constructor(
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
  ) {}

  async execute(): Promise<AnalyticsSummary> {
    const [pessoas, empresas, importacoes, snapshotsAtuais, todasAsVersoes] = await Promise.all([
      this.pessoaRepository.findAll(),
      this.empresaRepository.findAll(),
      this.importBatchRepository.count(),
      this.versionSnapshotRepository.findLatestPerDossie(),
      this.versionSnapshotRepository.findAll(),
    ]);

    return AnalyticsSummaryBuilder.build(snapshotsAtuais, todasAsVersoes, {
      pessoas: pessoas.length,
      empresas: empresas.length,
      importacoes,
    });
  }
}
