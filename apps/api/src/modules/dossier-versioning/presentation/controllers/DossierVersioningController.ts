import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { VersionSnapshot } from "../../domain/entities/VersionSnapshot.js";
import type { VersionDiff } from "../../domain/value-objects/VersionDiff.js";
import type { VersionTimelineEntry } from "../../domain/value-objects/VersionTimelineEntry.js";
import type { DiffDossieVersionsUseCase } from "../../application/use-cases/DiffDossieVersionsUseCase.js";
import type { GetDossieVersionUseCase } from "../../application/use-cases/GetDossieVersionUseCase.js";
import type { ListDossieVersionsUseCase } from "../../application/use-cases/ListDossieVersionsUseCase.js";

function parseVersionParam(raw: string | undefined, nomeParam: string): number {
  const versao = Number(raw);
  if (!Number.isInteger(versao) || versao < 1) {
    throw new AppError(
      "VALIDATION",
      `Parâmetro "${nomeParam}" deve ser um número de versão inteiro e positivo`,
    );
  }
  return versao;
}

export class DossierVersioningController {
  constructor(
    private readonly listDossieVersionsUseCase: ListDossieVersionsUseCase,
    private readonly getDossieVersionUseCase: GetDossieVersionUseCase,
    private readonly diffDossieVersionsUseCase: DiffDossieVersionsUseCase,
  ) {}

  history = async (req: Request, res: Response): Promise<void> => {
    const entradas = await this.listDossieVersionsUseCase.execute(req.params.id ?? "");
    res.status(200).json({ items: entradas.map(toTimelineEntryResponse) });
  };

  historyByVersion = async (req: Request, res: Response): Promise<void> => {
    const versao = parseVersionParam(req.params.version, "version");
    const snapshot = await this.getDossieVersionUseCase.execute(req.params.id ?? "", versao);
    res.status(200).json(toSnapshotResponse(snapshot));
  };

  diff = async (req: Request, res: Response): Promise<void> => {
    const versaoAnterior = parseVersionParam(req.params.v1, "v1");
    const versaoAtual = parseVersionParam(req.params.v2, "v2");
    const diff = await this.diffDossieVersionsUseCase.execute(
      req.params.id ?? "",
      versaoAnterior,
      versaoAtual,
    );
    res.status(200).json(toDiffResponse(diff));
  };
}

function toTimelineEntryResponse(entrada: VersionTimelineEntry) {
  return {
    versao: entrada.versao,
    timestamp: entrada.timestamp.toISOString(),
    usuarioId: entrada.usuarioId,
    hash: entrada.hash,
    resumoMudancas: entrada.resumoMudancas,
  };
}

function toSnapshotResponse(snapshot: VersionSnapshot) {
  return {
    id: snapshot.id,
    dossieId: snapshot.dossieId,
    versao: snapshot.versao,
    timestamp: snapshot.timestamp.toISOString(),
    usuarioId: snapshot.usuarioId,
    evidencias: snapshot.evidencias,
    classificacao: snapshot.classificacao,
    justificativaGeral: snapshot.justificativaGeral,
    fatores: snapshot.fatores,
    recomendacoes: snapshot.recomendacoes,
    prompt: snapshot.prompt,
    confidenceScore: snapshot.confidenceScore,
    riskScore: snapshot.riskScore,
    hash: snapshot.hash,
  };
}

function toDiffResponse(diff: VersionDiff) {
  return diff;
}
