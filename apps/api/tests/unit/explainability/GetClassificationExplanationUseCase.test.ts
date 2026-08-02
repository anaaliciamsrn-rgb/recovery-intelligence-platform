import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../../../src/modules/classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../../../src/modules/classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { GetClassificationExplanationUseCase } from "../../../src/modules/explainability/application/use-cases/GetClassificationExplanationUseCase.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { BuildPromptUseCase } from "../../../src/modules/prompt-builder/application/use-cases/BuildPromptUseCase.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaAmigavelRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";
import { FakeClock } from "./fakes.js";

const CRIADO_EM = new Date("2026-01-01T00:00:00Z");
const CONSULTA_EM = new Date("2026-01-01T12:00:00Z");
const ATUALIZADO_EM = new Date("2026-01-01T12:00:01Z");
const AGORA = new Date("2026-01-02T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

function buildUseCase(
  dossieRepository: FakeDossieRepository,
  pessoaRepository: FakePessoaRepository,
) {
  const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, [
    new PendenciaFiscalPgfnRule(),
    new ProcessoJudicialDataJudRule(),
    new SituacaoCadastralReceitaRule(),
  ]);
  const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, [
    new RecomendarWhatsappRule(),
    new RecomendarCobrancaAmigavelRule(),
    new RecomendarLigacaoRule(),
    new RecomendarParcelamentoRule(),
    new RecomendarCobrancaJuridicaRule(),
  ]);
  const buildPromptUseCase = new BuildPromptUseCase(
    dossieRepository,
    pessoaRepository,
    new FakeEmpresaRepository(),
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
  );
  const clock = new FakeClock(AGORA);

  return new GetClassificationExplanationUseCase(
    dossieRepository,
    classificarDossieUseCase,
    gerarRecomendacoesUseCase,
    buildPromptUseCase,
    clock,
  );
}

describe("GetClassificationExplanationUseCase", () => {
  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const dossieRepository = new FakeDossieRepository();
    const useCase = buildUseCase(dossieRepository, new FakePessoaRepository());

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("monta a explicação completa com fatores ligados à evidência real e a timeline de decisão", async () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: CRIADO_EM,
    });
    dossie.atualizarEvidencia(
      "PGFN",
      Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: CONSULTA_EM,
        confidenceScore: CONF,
      }),
      ATUALIZADO_EM,
    );
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(dossie);

    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "p1",
        cpf: CPF.create("52998224725"),
        nome: "Sujeito de Teste",
        createdAt: CRIADO_EM,
        updatedAt: CRIADO_EM,
      }),
    );

    const useCase = buildUseCase(dossieRepository, pessoaRepository);

    const explicacao = await useCase.execute("d1");

    expect(explicacao.dossieId).toBe("d1");
    expect(explicacao.geradoEm).toEqual(AGORA);
    expect(explicacao.classe).toBe("ALTO_RISCO");
    expect(explicacao.score.toNumber()).toBe(1);

    expect(explicacao.fatores).toHaveLength(1);
    const fator = explicacao.fatores[0];
    expect(fator?.fonte).toBe("PGFN");
    expect(fator?.impacto).toBe(0.4);
    expect(fator?.evidencia.status).toBe("ENCONTRADO");
    expect(fator?.evidencia.status === "ENCONTRADO" && fator.evidencia.dataConsulta).toEqual(
      CONSULTA_EM,
    );

    expect(explicacao.recomendacoes.length).toBeGreaterThan(0);

    expect(explicacao.timeline.map((evento) => evento.etapa)).toEqual([
      "CONSULTA_INICIADA",
      "FONTES_CONSULTADAS",
      "DOSSIE_ATUALIZADO",
      "CLASSIFICACAO_EXECUTADA",
      "RECOMENDACAO_GERADA",
      "PROMPT_CRIADO",
    ]);
    expect(explicacao.timeline[0]?.timestamp).toEqual(CRIADO_EM);
    expect(explicacao.timeline[1]?.timestamp).toEqual(CONSULTA_EM);
    expect(explicacao.timeline[2]?.timestamp).toEqual(ATUALIZADO_EM);
    expect(explicacao.timeline[3]?.timestamp).toEqual(AGORA);
    expect(explicacao.timeline[4]?.timestamp).toEqual(AGORA);
    expect(explicacao.timeline[5]?.timestamp).toEqual(AGORA);
  });

  it("devolve fatores vazios e timeline honesta quando nenhuma fonte foi consultada", async () => {
    const dossie = Dossie.criarVazio({
      id: "d2",
      subjectType: "PESSOA",
      subjectId: "p2",
      now: CRIADO_EM,
    });
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(dossie);

    const pessoaRepository = new FakePessoaRepository();
    pessoaRepository.seed(
      Pessoa.create({
        id: "p2",
        cpf: CPF.create("11144477735"),
        nome: "Sujeito Vazio",
        createdAt: CRIADO_EM,
        updatedAt: CRIADO_EM,
      }),
    );

    const useCase = buildUseCase(dossieRepository, pessoaRepository);

    const explicacao = await useCase.execute("d2");

    expect(explicacao.fatores).toEqual([]);
    expect(explicacao.classe).toBe("BAIXO_RISCO");
    expect(explicacao.confianca.toNumber()).toBe(0);
    expect(explicacao.timeline[1]?.timestamp).toBeNull();
  });
});
