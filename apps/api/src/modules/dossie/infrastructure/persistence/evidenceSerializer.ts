import { ConfidenceScore } from "../../../../domain/value-objects/ConfidenceScore.js";
import { Evidence, EvidenceStatus } from "../../../../domain/value-objects/Evidence.js";

interface EvidenceJson {
  status: EvidenceStatus;
  valor?: unknown;
  fonte?: string;
  dataConsulta?: string;
  confidenceScore?: number;
  motivoErro?: string;
}

/**
 * `Evidence<T>` é uma union discriminada, não um formato relacional fixo —
 * por isso é persistida como JSON (`Prisma.Json`), não como colunas. Este
 * serializer é o único lugar que sabe converter entre o tipo de domínio e o
 * JSON armazenado; nenhuma outra camada deveria fazer essa conversão. Ver
 * ADR 0015.
 */
export function serializeEvidence(evidence: Evidence<unknown>): EvidenceJson {
  switch (evidence.status) {
    case EvidenceStatus.ENCONTRADO:
      return {
        status: evidence.status,
        valor: evidence.valor,
        fonte: evidence.fonte,
        dataConsulta: evidence.dataConsulta.toISOString(),
        confidenceScore: evidence.confidenceScore.toNumber(),
      };
    case EvidenceStatus.NAO_ENCONTRADO:
      return {
        status: evidence.status,
        fonte: evidence.fonte,
        dataConsulta: evidence.dataConsulta.toISOString(),
        confidenceScore: evidence.confidenceScore.toNumber(),
      };
    case EvidenceStatus.NAO_CONSULTADO:
      return { status: evidence.status, fonte: evidence.fonte };
    case EvidenceStatus.ERRO_CONSULTA:
      return {
        status: evidence.status,
        fonte: evidence.fonte,
        dataConsulta: evidence.dataConsulta.toISOString(),
        motivoErro: evidence.motivoErro,
      };
  }
}

export function deserializeEvidence(json: unknown): Evidence<unknown> {
  const value = json as EvidenceJson;

  switch (value.status) {
    case EvidenceStatus.ENCONTRADO:
      return Evidence.encontrada({
        valor: value.valor,
        fonte: value.fonte ?? "",
        dataConsulta: new Date(value.dataConsulta ?? 0),
        confidenceScore: ConfidenceScore.create(value.confidenceScore ?? 0),
      });
    case EvidenceStatus.NAO_ENCONTRADO:
      return Evidence.naoEncontrada({
        fonte: value.fonte ?? "",
        dataConsulta: new Date(value.dataConsulta ?? 0),
        confidenceScore: ConfidenceScore.create(value.confidenceScore ?? 0),
      });
    case EvidenceStatus.ERRO_CONSULTA:
      return Evidence.comErro({
        fonte: value.fonte ?? "",
        dataConsulta: new Date(value.dataConsulta ?? 0),
        motivoErro: value.motivoErro ?? "",
      });
    case EvidenceStatus.NAO_CONSULTADO:
    default:
      return Evidence.naoConsultada({ fonte: value.fonte ?? "" });
  }
}
