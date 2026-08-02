import { AppError } from "../../../../application/errors/AppError.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import { TimelineVersionBuilder } from "../../domain/services/TimelineVersionBuilder.js";
import type { IVersionSnapshotRepository } from "../../domain/repositories/IVersionSnapshotRepository.js";
import type { VersionTimelineEntry } from "../../domain/value-objects/VersionTimelineEntry.js";

/** `GET /dossiers/:id/history`. */
export class ListDossieVersionsUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
  ) {}

  async execute(dossieId: string): Promise<VersionTimelineEntry[]> {
    const dossie = await this.dossieRepository.findById(dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const snapshots = await this.versionSnapshotRepository.findByDossieId(dossieId);
    return TimelineVersionBuilder.build(snapshots);
  }
}
