import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { ProcessoJudicialDataJudRule } from "../../../src/modules/classification/infrastructure/rules/ProcessoJudicialDataJudRule.js";
import { SituacaoCadastralReceitaRule } from "../../../src/modules/classification/infrastructure/rules/SituacaoCadastralReceitaRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { Pessoa } from "../../../src/modules/party/domain/entities/Pessoa.js";
import { CPF } from "../../../src/modules/party/domain/value-objects/CPF.js";
import { RecomendarCobrancaAmigavelRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaAmigavelRule.js";
import { RecomendarCobrancaJuridicaRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarLigacaoRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarLigacaoRule.js";
import { RecomendarParcelamentoRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarParcelamentoRule.js";
import { RecomendarWhatsappRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { RunSimulationUseCase } from "../../../src/modules/simulation/application/use-cases/RunSimulationUseCase.js";
import { InMemoryDossieRepositoryFactory } from "../../../src/modules/simulation/infrastructure/InMemoryDossieRepository.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeEmpresaRepository, FakePessoaRepository } from "../party/fakes.js";
import { FakeClock } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF = ConfidenceScore.create(0.9);

function buildUseCase(
  dossieRepository: FakeDossieRepository,
  pessoaRepository: FakePessoaRepository,
) {
  return new RunSimulationUseCase(
    dossieRepository,
    pessoaRepository,
    new FakeEmpresaRepository(),
    [
      new PendenciaFiscalPgfnRule(),
      new ProcessoJudicialDataJudRule(),
      new SituacaoCadastralReceitaRule(),
    ],
    [
      new RecomendarWhatsappRule(),
      new RecomendarCobrancaAmigavelRule(),
      new RecomendarLigacaoRule(),
      new RecomendarParcelamentoRule(),
      new RecomendarCobrancaJuridicaRule(),
    ],
    new FakeClock(NOW),
    new InMemoryDossieRepositoryFactory(),
  );
}

function seedPessoa(pessoaRepository: FakePessoaRepository) {
  pessoaRepository.seed(
    Pessoa.create({
      id: "p1",
      cpf: CPF.create("52998224725"),
      nome: "Sujeito Simulado",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  );
}

describe("RunSimulationUseCase", () => {
  it("lança NOT_FOUND quando o dossiê não existe", async () => {
    const useCase = buildUseCase(new FakeDossieRepository(), new FakePessoaRepository());

    await expect(useCase.execute({ dossieId: "inexistente", changes: [] })).rejects.toMatchObject({
      kind: "NOT_FOUND",
    });
  });

  it("com changes vazio, antes e depois são idênticos e o resumo é o de nenhuma mudança", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const pessoaRepository = new FakePessoaRepository();
    seedPessoa(pessoaRepository);

    const resultado = await buildUseCase(dossieRepository, pessoaRepository).execute({
      dossieId: "d1",
      changes: [],
    });

    expect(resultado.deltas).toEqual({
      riskScoreDelta: 0,
      confidenceScoreDelta: 0,
      classificacaoMudou: false,
      recomendacaoMudou: false,
      promptMudou: false,
    });
    expect(resultado.mudancasDetectadas).toEqual([]);
    expect(resultado.impactos).toEqual([]);
    expect(resultado.resumo).toContain("Nenhuma mudança hipotética foi aplicada");
  });

  it("simula a remoção da evidência PGFN e reduz o risco, sem persistir nada no dossiê real", async () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: NOW,
    });
    dossie.atualizarEvidencia(
      "PGFN",
      Evidence.encontrada({
        valor: { temPendencia: true },
        fonte: "PGFN",
        dataConsulta: NOW,
        confidenceScore: CONF,
      }),
      NOW,
    );
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(dossie);
    const pessoaRepository = new FakePessoaRepository();
    seedPessoa(pessoaRepository);

    const resultado = await buildUseCase(dossieRepository, pessoaRepository).execute({
      dossieId: "d1",
      changes: [{ tipo: "EVIDENCIA", fonte: "PGFN", acao: "REMOVER" }],
    });

    expect(resultado.antes.classificacao).toBe("ALTO_RISCO");
    expect(resultado.depois.classificacao).toBe("BAIXO_RISCO");
    expect(resultado.deltas.riskScoreDelta).toBeLessThan(0);
    expect(resultado.mudancasDetectadas).toContain("PGFN removida");
    expect(resultado.impactos).toHaveLength(1);
    expect(resultado.impactos[0]?.afetouRisco).toBe(true);

    const dossieAposSimulacao = await dossieRepository.findById("d1");
    expect(dossieAposSimulacao?.evidencias.pgfn.status).toBe("ENCONTRADO");
  });

  it("simula a adição de uma evidência DataJud desfavorável, aumentando o risco", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const pessoaRepository = new FakePessoaRepository();
    seedPessoa(pessoaRepository);

    const resultado = await buildUseCase(dossieRepository, pessoaRepository).execute({
      dossieId: "d1",
      changes: [
        {
          tipo: "EVIDENCIA",
          fonte: "DATAJUD",
          acao: "SUBSTITUIR",
          status: "ENCONTRADO",
          valor: { temProcesso: true },
          confidenceScore: 0.9,
        },
      ],
    });

    expect(resultado.antes.classificacao).toBe("BAIXO_RISCO");
    expect(resultado.depois.classificacao).toBe("ALTO_RISCO");
    expect(resultado.deltas.riskScoreDelta).toBeGreaterThan(0);
  });

  it("aplica overrides de classificação e confiança propagando até a recomendação e o prompt", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const pessoaRepository = new FakePessoaRepository();
    seedPessoa(pessoaRepository);

    const resultado = await buildUseCase(dossieRepository, pessoaRepository).execute({
      dossieId: "d1",
      changes: [
        { tipo: "CLASSIFICACAO_OVERRIDE", valor: "ALTO_RISCO" },
        { tipo: "CONFIANCA_OVERRIDE", valor: 0.9 },
      ],
    });

    expect(resultado.depois.classificacao).toBe("ALTO_RISCO");
    expect(resultado.depois.confidenceScore).toBe(0.9);
    expect(resultado.deltas.classificacaoMudou).toBe(true);
    expect(resultado.deltas.confidenceScoreDelta).toBeCloseTo(0.9);
    expect(resultado.depois.prompt.texto).toContain("ALTO_RISCO");
    expect(resultado.impactos).toHaveLength(2);
  });
});
