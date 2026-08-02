import { SnapshotHashService } from "../../domain/services/SnapshotHashService.js";
import { VersionSnapshot } from "../../domain/entities/VersionSnapshot.js";
import type { IVersionSnapshotRepository } from "../../domain/repositories/IVersionSnapshotRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { SnapshotBuilder } from "../services/SnapshotBuilder.js";

export interface CreateVersionSnapshotInput {
  dossieId: string;
  usuarioId: string | null;
}

/**
 * Cria a próxima versão (`max(versao) + 1`, ou `1` se for a primeira) de um
 * Dossiê — nunca sobrescreve uma versão existente. Chamado pelo middleware
 * de observação (ver `versionSnapshot.middleware.ts`) depois de uma
 * criação de Dossiê ou atualização de Evidência bem-sucedida, nunca por
 * nenhum use case dos módulos observados. Ver ADR 0022.
 */
export class CreateVersionSnapshotUseCase {
  constructor(
    private readonly snapshotBuilder: SnapshotBuilder,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateVersionSnapshotInput): Promise<VersionSnapshot> {
    const content = await this.snapshotBuilder.build(input.dossieId);
    const hash = SnapshotHashService.compute(content);
    const ultimaVersao = await this.versionSnapshotRepository.findLatestVersionNumber(
      input.dossieId,
    );

    const snapshot = VersionSnapshot.create({
      id: this.idGenerator.generateId(),
      dossieId: input.dossieId,
      versao: (ultimaVersao ?? 0) + 1,
      timestamp: this.clock.now(),
      usuarioId: input.usuarioId,
      hash,
      ...content,
    });

    await this.versionSnapshotRepository.save(snapshot);
    return snapshot;
  }
}
