import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { IVersionSnapshotRepository } from "../../../dossier-versioning/domain/repositories/IVersionSnapshotRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../tenant/domain/repositories/ITenantResourceOwnershipRepository.js";
import type { IImportBatchRepository } from "../../domain/repositories/IImportBatchRepository.js";

const RESOURCE_TYPE_DOSSIE = "Dossie";
const RESOURCE_TYPE_IMPORT_BATCH = "ImportBatch";

export interface ResetTenantImportedDataOutput {
  dossiesRemovidos: number;
  importacoesRemovidas: number;
}

/**
 * Desfaz todas as importações de empresas do tenant do chamador — apaga só
 * os Dossiês/VersionSnapshots/ImportBatches que pertencem a esse tenant
 * (nunca a `Empresa`/`Pessoa` em si, dados de referência compartilhados
 * globalmente entre tenants, ver ADR 0011/0037) e limpa o
 * `TenantResourceOwnership` correspondente, deixando o tenant pronto para
 * uma nova importação. Ver ADR 0037 — pensado para permitir reapresentar a
 * demonstração do zero, não é um fluxo de "arrependimento" de produção.
 */
export class ResetTenantImportedDataUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
    private readonly importBatchRepository: IImportBatchRepository,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(tenantId: string): Promise<ResetTenantImportedDataOutput> {
    const [dossieIds, importBatchIds] = await Promise.all([
      this.tenantResourceOwnershipRepository.listResourceIds(tenantId, RESOURCE_TYPE_DOSSIE),
      this.tenantResourceOwnershipRepository.listResourceIds(tenantId, RESOURCE_TYPE_IMPORT_BATCH),
    ]);

    await this.versionSnapshotRepository.deleteByDossieIds(dossieIds);
    await this.dossieRepository.deleteMany(dossieIds);
    await this.importBatchRepository.deleteMany(importBatchIds);

    await this.tenantResourceOwnershipRepository.deleteByTenantAndType(
      tenantId,
      RESOURCE_TYPE_DOSSIE,
    );
    await this.tenantResourceOwnershipRepository.deleteByTenantAndType(
      tenantId,
      RESOURCE_TYPE_IMPORT_BATCH,
    );

    return { dossiesRemovidos: dossieIds.length, importacoesRemovidas: importBatchIds.length };
  }
}
