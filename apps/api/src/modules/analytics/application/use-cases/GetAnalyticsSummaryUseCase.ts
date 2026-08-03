import type { IVersionSnapshotRepository } from "../../../dossier-versioning/domain/repositories/IVersionSnapshotRepository.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { IEmpresaRepository } from "../../../party/domain/repositories/IEmpresaRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../tenant/domain/repositories/ITenantResourceOwnershipRepository.js";
import { AnalyticsSummaryBuilder } from "../../domain/services/AnalyticsSummaryBuilder.js";
import type { AnalyticsSummary } from "../../domain/value-objects/AnalyticsSummary.js";

const RESOURCE_TYPE_DOSSIE = "Dossie";
const RESOURCE_TYPE_IMPORT_BATCH = "ImportBatch";

/**
 * Depende diretamente de `dossier-versioning`/`dossie`/`tenant` — exceção
 * deliberada ao padrão de independência entre módulos-etapa (mesma
 * justificativa de `confidence-heatmap`, ADR 0024): analytics agrega dados
 * reais já existentes, nunca fabrica números. Ver ADR 0025.
 *
 * **Tenant-scoped (ADR 0037)**: todo KPI é calculado só sobre os Dossiês e
 * lotes de importação registrados como propriedade do tenant do chamador
 * via `TenantResourceOwnership` — nunca sobre a base inteira da plataforma.
 * Um tenant sem nenhuma importação ainda recebe um `AnalyticsSummary`
 * zerado (nunca dados de outro tenant, nunca dados fictícios automáticos) —
 * é esse zero que o frontend interpreta como "mostrar estado vazio".
 */
export class GetAnalyticsSummaryUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
    private readonly empresaRepository: IEmpresaRepository,
  ) {}

  async execute(tenantId: string): Promise<AnalyticsSummary> {
    const [dossieIds, importBatchIds] = await Promise.all([
      this.tenantResourceOwnershipRepository.listResourceIds(tenantId, RESOURCE_TYPE_DOSSIE),
      this.tenantResourceOwnershipRepository.listResourceIds(tenantId, RESOURCE_TYPE_IMPORT_BATCH),
    ]);
    const dossieIdSet = new Set(dossieIds);

    const [dossies, snapshotsAtuaisTodos, todasAsVersoesTodos] = await Promise.all([
      this.dossieRepository.findManyByIds(dossieIds),
      this.versionSnapshotRepository.findLatestPerDossie(),
      this.versionSnapshotRepository.findAll(),
    ]);

    const snapshotsAtuais = snapshotsAtuaisTodos.filter((snapshot) =>
      dossieIdSet.has(snapshot.dossieId),
    );
    const todasAsVersoes = todasAsVersoesTodos.filter((snapshot) =>
      dossieIdSet.has(snapshot.dossieId),
    );

    const dossiesEmpresa = dossies.filter((dossie) => dossie.subjectType === "EMPRESA");
    const empresas = await Promise.all(
      dossiesEmpresa.map((dossie) => this.empresaRepository.findById(dossie.subjectId)),
    );
    const nomePorDossieId = new Map<string, string>();
    dossiesEmpresa.forEach((dossie, index) => {
      const empresa = empresas[index];
      if (empresa) nomePorDossieId.set(dossie.id, empresa.razaoSocial);
    });

    return AnalyticsSummaryBuilder.build(snapshotsAtuais, todasAsVersoes, {
      pessoas: dossies.filter((dossie) => dossie.subjectType === "PESSOA").length,
      empresas: dossiesEmpresa.length,
      importacoes: importBatchIds.length,
      nomePorDossieId,
    });
  }
}
