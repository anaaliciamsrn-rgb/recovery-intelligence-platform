import { AppError } from "../../../../application/errors/AppError.js";
import { VersionDiffService } from "../../domain/services/VersionDiffService.js";
import type { IVersionSnapshotRepository } from "../../domain/repositories/IVersionSnapshotRepository.js";
import type { VersionDiff } from "../../domain/value-objects/VersionDiff.js";

/** `GET /dossiers/:id/diff/:v1/:v2`. */
export class DiffDossieVersionsUseCase {
  constructor(private readonly versionSnapshotRepository: IVersionSnapshotRepository) {}

  async execute(
    dossieId: string,
    versaoAnterior: number,
    versaoAtual: number,
  ): Promise<VersionDiff> {
    const [snapshotAnterior, snapshotAtual] = await Promise.all([
      this.versionSnapshotRepository.findByDossieIdAndVersion(dossieId, versaoAnterior),
      this.versionSnapshotRepository.findByDossieIdAndVersion(dossieId, versaoAtual),
    ]);

    if (!snapshotAnterior) {
      throw new AppError("NOT_FOUND", `Versão ${versaoAnterior} não encontrada para este dossiê`);
    }
    if (!snapshotAtual) {
      throw new AppError("NOT_FOUND", `Versão ${versaoAtual} não encontrada para este dossiê`);
    }

    return VersionDiffService.diff(snapshotAnterior, snapshotAtual);
  }
}
