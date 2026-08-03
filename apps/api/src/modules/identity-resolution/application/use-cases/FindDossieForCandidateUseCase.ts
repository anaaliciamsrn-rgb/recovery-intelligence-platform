import type { IVersionSnapshotRepository } from "../../../dossier-versioning/domain/repositories/IVersionSnapshotRepository.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { DossieSubjectType } from "../../../dossie/domain/value-objects/DossieSubjectType.js";
import { TenantPolicy } from "../../../tenant/domain/services/TenantPolicy.js";
import type { ITenantResourceOwnershipRepository } from "../../../tenant/domain/repositories/ITenantResourceOwnershipRepository.js";

const RESOURCE_TYPE_DOSSIE = "Dossie";

export interface FindDossieForCandidateInput {
  tenantId: string;
  subjectType: DossieSubjectType;
  subjectId: string;
}

export interface FindDossieForCandidateOutput {
  dossieId: string;
  classificacao: string | null;
  riskScore: number | null;
}

/**
 * Liga um candidato da busca de identidade a um Dossiê já existente, se
 * houver — mas só devolve o Dossiê se ele pertencer ao tenant do chamador
 * (ver ADR 0037). `Pessoa`/`Empresa` são cadastro global compartilhado
 * (ADR 0011), então um Dossiê para o mesmo CNPJ pode existir para OUTRO
 * tenant — fail-closed, igual a `TenantPolicy`: sem ownership confirmado, o
 * Dossiê é tratado como inexistente para este chamador, nunca vaza.
 *
 * `classificacao`/`riskScore`: `null` quando o Dossiê existe mas ainda não
 * tem nenhuma versão computada (ver dossier-versioning, ADR 0022) — não
 * confundir com "não tem Dossiê" (a função toda devolvendo `null`).
 */
export class FindDossieForCandidateUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly versionSnapshotRepository: IVersionSnapshotRepository,
    private readonly tenantResourceOwnershipRepository: ITenantResourceOwnershipRepository,
  ) {}

  async execute(input: FindDossieForCandidateInput): Promise<FindDossieForCandidateOutput | null> {
    const dossie = await this.dossieRepository.findBySubject(input.subjectType, input.subjectId);
    if (!dossie) return null;

    const ownership = await this.tenantResourceOwnershipRepository.findByResource(
      RESOURCE_TYPE_DOSSIE,
      dossie.id,
    );
    if (!TenantPolicy.podeAcessar(ownership, input.tenantId)) return null;

    const versoes = await this.versionSnapshotRepository.findByDossieId(dossie.id);
    const ultimaVersao = versoes[versoes.length - 1] ?? null;

    return {
      dossieId: dossie.id,
      classificacao: ultimaVersao?.classificacao ?? null,
      riskScore: ultimaVersao?.riskScore ?? null,
    };
  }
}
