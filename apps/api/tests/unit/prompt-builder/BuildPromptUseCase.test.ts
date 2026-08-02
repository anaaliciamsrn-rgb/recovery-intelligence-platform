import { AppError } from "../../../src/application/errors/AppError.js";
import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { BuildPromptUseCase } from "../../../src/modules/prompt-builder/application/use-cases/BuildPromptUseCase.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarWhatsappRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildUseCase() {
  const dossieRepository = new FakeDossieRepository();
  const pessoaRepository = new FakePessoaRepository();
  const empresaRepository = new FakeEmpresaRepository();
  pessoaRepository.seed(
    Pessoa.create({
      id: "pessoa-1",
      cpf: CPF.create("52998224725"),
      nome: "Ana Alícia",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
  dossieRepository.seed(
    Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "pessoa-1", now: NOW }),
  );

  const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, [
    new PendenciaFiscalPgfnRule(),
  ]);
  const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, [
    new RecomendarWhatsappRule(),
  ]);

  const useCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    empresaRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );

  return { useCase, dossieRepository };
}

describe("BuildPromptUseCase", () => {
  it("monta o contexto com sujeito, classificação e recomendações", async () => {
    const { useCase } = buildUseCase();

    const context = await useCase.execute("d1");

    expect(context.dossieId).toBe("d1");
    expect(context.subject).toEqual({
      tipo: "PESSOA",
      id: "pessoa-1",
      documento: "52998224725",
      nome: "Ana Alícia",
    });
    expect(context.classificacao.classe).toBe("BAIXO_RISCO");
    expect(context.recomendacoes).toHaveLength(1);
    expect(context.recomendacoes[0]?.canal).toBe("WHATSAPP");
  });

  it("inclui fatores da classificação quando há evidências respondidas", async () => {
    const { useCase, dossieRepository } = buildUseCase();
    const dossie = await dossieRepository.findById("d1");
    dossie?.atualizarEvidencia(
      "PGFN",
      Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: ConfidenceScore.create(0.9),
      }),
      NOW,
    );
    if (dossie) await dossieRepository.save(dossie);

    const context = await useCase.execute("d1");

    expect(context.classificacao.fatores).toHaveLength(1);
    expect(context.classificacao.fatores[0]?.nome).toBe("Pendência Fiscal (PGFN)");
  });

  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
