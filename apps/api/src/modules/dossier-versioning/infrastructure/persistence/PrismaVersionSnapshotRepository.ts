import {
  type PrismaClient,
  type VersionSnapshot as PrismaVersionSnapshotRecord,
  Prisma,
} from "@prisma/client";
import { VersionSnapshot } from "../../domain/entities/VersionSnapshot.js";
import type { IVersionSnapshotRepository } from "../../domain/repositories/IVersionSnapshotRepository.js";
import type {
  DossieEvidenciasSnapshot,
  FatorSnapshot,
  PromptSnapshot,
  RecomendacaoSnapshotItem,
} from "../../domain/value-objects/SnapshotContent.js";

export class PrismaVersionSnapshotRepository implements IVersionSnapshotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Só `create` — nunca update/delete, o agregado é append-only por design (ver ADR 0022). */
  async save(snapshot: VersionSnapshot): Promise<void> {
    const props = snapshot.toProps();

    await this.prisma.versionSnapshot.create({
      data: {
        id: props.id,
        dossieId: props.dossieId,
        versao: props.versao,
        timestamp: props.timestamp,
        usuarioId: props.usuarioId,
        evidencias: props.evidencias as unknown as Prisma.InputJsonValue,
        classificacao: props.classificacao,
        justificativaGeral: props.justificativaGeral,
        fatores: props.fatores as unknown as Prisma.InputJsonValue,
        recomendacoes: props.recomendacoes as unknown as Prisma.InputJsonValue,
        prompt: props.prompt as unknown as Prisma.InputJsonValue,
        confidenceScore: props.confidenceScore,
        riskScore: props.riskScore,
        hash: props.hash,
      },
    });
  }

  async findLatestVersionNumber(dossieId: string): Promise<number | null> {
    const ultimo = await this.prisma.versionSnapshot.findFirst({
      where: { dossieId },
      orderBy: { versao: "desc" },
      select: { versao: true },
    });
    return ultimo?.versao ?? null;
  }

  async findByDossieId(dossieId: string): Promise<VersionSnapshot[]> {
    const records = await this.prisma.versionSnapshot.findMany({
      where: { dossieId },
      orderBy: { versao: "asc" },
    });
    return records.map((record) => this.toDomain(record));
  }

  async findByDossieIdAndVersion(
    dossieId: string,
    versao: number,
  ): Promise<VersionSnapshot | null> {
    const record = await this.prisma.versionSnapshot.findUnique({
      where: { dossieId_versao: { dossieId, versao } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findLatestPerDossie(): Promise<VersionSnapshot[]> {
    const grupos = await this.prisma.versionSnapshot.groupBy({
      by: ["dossieId"],
      _max: { versao: true },
    });
    const registros = await Promise.all(
      grupos
        .filter((grupo) => grupo._max.versao !== null)
        .map((grupo) =>
          this.prisma.versionSnapshot.findUnique({
            where: { dossieId_versao: { dossieId: grupo.dossieId, versao: grupo._max.versao! } },
          }),
        ),
    );
    return registros
      .filter((registro): registro is PrismaVersionSnapshotRecord => registro !== null)
      .map((registro) => this.toDomain(registro));
  }

  async findAll(): Promise<VersionSnapshot[]> {
    const records = await this.prisma.versionSnapshot.findMany({ orderBy: { timestamp: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async deleteByDossieIds(dossieIds: string[]): Promise<void> {
    if (dossieIds.length === 0) return;
    await this.prisma.versionSnapshot.deleteMany({ where: { dossieId: { in: dossieIds } } });
  }

  private toDomain(record: PrismaVersionSnapshotRecord): VersionSnapshot {
    return VersionSnapshot.create({
      id: record.id,
      dossieId: record.dossieId,
      versao: record.versao,
      timestamp: record.timestamp,
      usuarioId: record.usuarioId,
      evidencias: record.evidencias as unknown as DossieEvidenciasSnapshot,
      classificacao: record.classificacao,
      justificativaGeral: record.justificativaGeral,
      fatores: record.fatores as unknown as FatorSnapshot[],
      recomendacoes: record.recomendacoes as unknown as RecomendacaoSnapshotItem[],
      prompt: record.prompt as unknown as PromptSnapshot,
      confidenceScore: record.confidenceScore,
      riskScore: record.riskScore,
      hash: record.hash,
    });
  }
}
