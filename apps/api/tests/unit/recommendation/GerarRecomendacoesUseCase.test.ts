import { AppError } from "../../../src/application/errors/AppError.js";
import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { PendenciaFiscalPgfnRule } from "../../../src/modules/classification/infrastructure/rules/PendenciaFiscalPgfnRule.js";
import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { RecomendarCobrancaJuridicaRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarCobrancaJuridicaRule.js";
import { RecomendarWhatsappRule } from "../../../src/modules/recommendation/infrastructure/rules/RecomendarWhatsappRule.js";
import { FakeDossieRepository } from "../dossie/fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONF_ALTA = ConfidenceScore.create(0.9);

function buildUseCase(dossie: Dossie) {
  const dossieRepository = new FakeDossieRepository();
  dossieRepository.seed(dossie);
  const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, [
    new PendenciaFiscalPgfnRule(),
  ]);
  return new GerarRecomendacoesUseCase(classificarDossieUseCase, [
    new RecomendarWhatsappRule(),
    new RecomendarCobrancaJuridicaRule(),
  ]);
}

describe("GerarRecomendacoesUseCase", () => {
  it("recomenda WHATSAPP para um dossiê vazio (BAIXO_RISCO)", async () => {
    const dossie = Dossie.criarVazio({
      id: "d1",
      subjectType: "PESSOA",
      subjectId: "p1",
      now: NOW,
    });
    const useCase = buildUseCase(dossie);

    const resultado = await useCase.execute("d1");

    expect(resultado.classificacao.classe).toBe("BAIXO_RISCO");
    expect(resultado.recomendacoes).toHaveLength(1);
    expect(resultado.recomendacoes[0]?.canal).toBe("WHATSAPP");
  });

  it("recomenda COBRANCA_JURIDICA quando ALTO_RISCO com confiança suficiente (não BAIXA)", async () => {
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
        confidenceScore: CONF_ALTA,
      }),
      NOW,
    );
    // Duas evidências adicionais respondidas (mesmo sem regra própria) para
    // que a confiança geral (fração de evidências respondidas) saia da
    // faixa BAIXA — 3 de 5 = 0.6 = MEDIA. Sem isso, o motor corretamente se
    // recusa a recomendar ação drástica com base em dados incompletos (foi
    // exatamente esse comportamento que este teste tentava, sem querer,
    // contradizer na primeira versão).
    dossie.atualizarEvidencia(
      "DATAJUD",
      Evidence.naoEncontrada({ fonte: "DATAJUD", dataConsulta: NOW, confidenceScore: CONF_ALTA }),
      NOW,
    );
    dossie.atualizarEvidencia(
      "RECEITA_FEDERAL",
      Evidence.naoEncontrada({
        fonte: "RECEITA_FEDERAL",
        dataConsulta: NOW,
        confidenceScore: CONF_ALTA,
      }),
      NOW,
    );
    const useCase = buildUseCase(dossie);

    const resultado = await useCase.execute("d1");

    expect(resultado.classificacao.classe).toBe("ALTO_RISCO");
    expect(resultado.classificacao.nivelConfianca).not.toBe("BAIXA");
    expect(resultado.recomendacoes.map((r) => r.canal)).toContain("COBRANCA_JURIDICA");
  });

  it("cai no fallback quando nenhuma regra registrada se aplica", async () => {
    const dossieRepository = new FakeDossieRepository();
    dossieRepository.seed(
      Dossie.criarVazio({ id: "d1", subjectType: "PESSOA", subjectId: "p1", now: NOW }),
    );
    const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, []);
    // Nenhuma regra de recomendação registrada -> nada se aplica -> fallback.
    const useCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, []);

    const resultado = await useCase.execute("d1");

    expect(resultado.recomendacoes).toHaveLength(1);
    expect(resultado.recomendacoes[0]?.canal).toBe("COBRANCA_AMIGAVEL");
    expect(resultado.recomendacoes[0]?.justificativa).toContain("Nenhuma regra específica");
  });

  it("propaga NOT_FOUND quando o dossiê não existe", async () => {
    const dossieRepository = new FakeDossieRepository();
    const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, []);
    const useCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, []);

    await expect(useCase.execute("inexistente")).rejects.toMatchObject({
      kind: "NOT_FOUND",
    } satisfies Partial<AppError>);
  });
});
