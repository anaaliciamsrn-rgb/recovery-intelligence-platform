import { AppError } from "../../../../application/errors/AppError.js";
import type { VersionSnapshot } from "../../domain/entities/VersionSnapshot.js";
import type { IVersionSnapshotRepository } from "../../domain/repositories/IVersionSnapshotRepository.js";

/** `GET /dossiers/:id/history/:version`. */
export class GetDossieVersionUseCase {
  constructor(private readonly versionSnapshotRepository: IVersionSnapshotRepository) {}

  async execute(dossieId: string, versao: number): Promise<VersionSnapshot> {
    const snapshot = await this.versionSnapshotRepository.findByDossieIdAndVersion(
      dossieId,
      versao,
    );
    if (!snapshot) {
      throw new AppError("NOT_FOUND", `Versão ${versao} não encontrada para este dossiê`);
    }
    return snapshot;
  }
}
