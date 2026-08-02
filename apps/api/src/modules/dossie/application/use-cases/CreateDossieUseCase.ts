import { AppError } from "../../../../application/errors/AppError.js";
import type { IEmpresaRepository } from "../../../party/domain/repositories/IEmpresaRepository.js";
import type { IPessoaRepository } from "../../../party/domain/repositories/IPessoaRepository.js";
import { Dossie } from "../../domain/entities/Dossie.js";
import type { DossieSubjectType } from "../../domain/value-objects/DossieSubjectType.js";
import type { IDossieRepository } from "../../domain/repositories/IDossieRepository.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";

export interface CreateDossieInput {
  subjectType: DossieSubjectType;
  subjectId: string;
}

export interface CreateDossieOutput {
  id: string;
  subjectType: DossieSubjectType;
  subjectId: string;
  geradoEm: Date;
}

/**
 * Cria um dossiê vazio (todas as evidências `NAO_CONSULTADO`) para uma
 * Pessoa ou Empresa já cadastrada. Valida a existência do sujeito antes de
 * criar — mesmo padrão de `RegisterParticipacaoSocietariaUseCase` (ADR 0012).
 * Nenhuma consulta externa acontece aqui (ver ADR 0015).
 */
export class CreateDossieUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
  ) {}

  async execute(input: CreateDossieInput): Promise<CreateDossieOutput> {
    await this.assertSubjectExists(input.subjectType, input.subjectId);

    const now = this.clock.now();
    const dossie = Dossie.criarVazio({
      id: this.idGenerator.generateId(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      now,
    });

    await this.dossieRepository.save(dossie);

    return {
      id: dossie.id,
      subjectType: dossie.subjectType,
      subjectId: dossie.subjectId,
      geradoEm: dossie.geradoEm,
    };
  }

  private async assertSubjectExists(
    subjectType: DossieSubjectType,
    subjectId: string,
  ): Promise<void> {
    if (subjectType === "PESSOA") {
      const pessoa = await this.pessoaRepository.findById(subjectId);
      if (!pessoa)
        throw new AppError("VALIDATION", "Pessoa não encontrada para o subjectId informado");
      return;
    }

    const empresa = await this.empresaRepository.findById(subjectId);
    if (!empresa)
      throw new AppError("VALIDATION", "Empresa não encontrada para o subjectId informado");
  }
}
