import type { Prisma, PrismaClient, Dossie as PrismaDossieRecord } from "@prisma/client";
import { Dossie } from "../../domain/entities/Dossie.js";
import type { DossieSubjectType } from "../../domain/value-objects/DossieSubjectType.js";
import type { IDossieRepository } from "../../domain/repositories/IDossieRepository.js";
import { deserializeEvidence, serializeEvidence } from "./evidenceSerializer.js";
import type { Evidence } from "../../../../domain/value-objects/Evidence.js";

/** `EvidenceJson` (interface fechada) não satisfaz `InputJsonObject` (exige index signature) — cast pragmático, único ponto de fronteira com o tipo do Prisma. */
function toJsonInput(evidence: Evidence<unknown>): Prisma.InputJsonValue {
  return serializeEvidence(evidence) as unknown as Prisma.InputJsonValue;
}

export class PrismaDossieRepository implements IDossieRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Dossie | null> {
    const record = await this.prisma.dossie.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async save(dossie: Dossie): Promise<void> {
    const props = dossie.toProps();

    const data = {
      subjectType: props.subjectType,
      subjectId: props.subjectId,
      geradoEm: props.geradoEm,
      evidenciaPgfn: toJsonInput(props.evidencias.pgfn),
      evidenciaDataJud: toJsonInput(props.evidencias.dataJud),
      evidenciaReceitaFederal: toJsonInput(props.evidencias.receitaFederal),
      evidenciaPortalTransparencia: toJsonInput(props.evidencias.portalTransparencia),
      evidenciaCenprot: toJsonInput(props.evidencias.cenprot),
    };

    await this.prisma.dossie.upsert({
      where: { id: props.id },
      create: { id: props.id, ...data },
      update: data,
    });
  }

  private toDomain(record: PrismaDossieRecord): Dossie {
    return Dossie.create({
      id: record.id,
      subjectType: record.subjectType as DossieSubjectType,
      subjectId: record.subjectId,
      geradoEm: record.geradoEm,
      evidencias: {
        pgfn: deserializeEvidence(record.evidenciaPgfn),
        dataJud: deserializeEvidence(record.evidenciaDataJud),
        receitaFederal: deserializeEvidence(record.evidenciaReceitaFederal),
        portalTransparencia: deserializeEvidence(record.evidenciaPortalTransparencia),
        cenprot: deserializeEvidence(record.evidenciaCenprot),
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
