import { AppError } from "../../../../application/errors/AppError.js";
import type { ClassificarDossieUseCase } from "../../../classification/application/use-cases/ClassificarDossieUseCase.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";
import type { IEmpresaRepository } from "../../../party/domain/repositories/IEmpresaRepository.js";
import type { IPessoaRepository } from "../../../party/domain/repositories/IPessoaRepository.js";
import type { GerarRecomendacoesUseCase } from "../../../recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import type { PromptContext } from "../../domain/models/PromptContext.js";

/**
 * Monta o `PromptContext` de um dossiê: busca o sujeito (Pessoa ou Empresa,
 * via `party`), classifica (via `classification`) e gera recomendações
 * (via `recommendation`) — reaproveita os use cases já existentes, sem
 * duplicar nenhuma lógica de negócio. Ver ADR 0018.
 */
export class BuildPromptUseCase {
  constructor(
    private readonly dossieRepository: IDossieRepository,
    private readonly pessoaRepository: IPessoaRepository,
    private readonly empresaRepository: IEmpresaRepository,
    private readonly classificarDossieUseCase: ClassificarDossieUseCase,
    private readonly gerarRecomendacoesUseCase: GerarRecomendacoesUseCase,
  ) {}

  async execute(dossieId: string): Promise<PromptContext> {
    const dossie = await this.dossieRepository.findById(dossieId);
    if (!dossie) {
      throw new AppError("NOT_FOUND", "Dossiê não encontrado");
    }

    const subject = await this.resolveSubject(dossie.subjectType, dossie.subjectId);

    const classificacao = await this.classificarDossieUseCase.execute(dossieId);
    const recomendacoes = await this.gerarRecomendacoesUseCase.execute(dossieId);

    return {
      dossieId,
      geradoEm: dossie.updatedAt.toISOString(),
      subject,
      classificacao: {
        classe: classificacao.classe,
        score: classificacao.score.toNumber(),
        confianca: classificacao.confianca.toNumber(),
        nivelConfianca: classificacao.confianca.nivel(),
        justificativaGeral: classificacao.justificativaGeral,
        fatores: classificacao.fatores.map((fator) => ({
          nome: fator.nome,
          peso: fator.peso,
          direcao: fator.direcao,
          justificativa: fator.justificativa,
        })),
      },
      recomendacoes: recomendacoes.recomendacoes.map((recomendacao) => ({
        canal: recomendacao.canal,
        justificativa: recomendacao.justificativa,
      })),
    };
  }

  private async resolveSubject(
    subjectType: string,
    subjectId: string,
  ): Promise<PromptContext["subject"]> {
    if (subjectType === "PESSOA") {
      const pessoa = await this.pessoaRepository.findById(subjectId);
      if (!pessoa) {
        throw new AppError("INTERNAL", "Pessoa referenciada pelo dossiê não foi encontrada");
      }
      return { tipo: "PESSOA", id: pessoa.id, documento: pessoa.cpf.toString(), nome: pessoa.nome };
    }

    const empresa = await this.empresaRepository.findById(subjectId);
    if (!empresa) {
      throw new AppError("INTERNAL", "Empresa referenciada pelo dossiê não foi encontrada");
    }
    return {
      tipo: "EMPRESA",
      id: empresa.id,
      documento: empresa.cnpj.toString(),
      nome: empresa.razaoSocial,
    };
  }
}
