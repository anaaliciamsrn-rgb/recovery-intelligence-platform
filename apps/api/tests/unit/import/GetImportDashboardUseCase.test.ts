import { Dossie } from "../../../src/modules/dossie/domain/entities/Dossie.js";
import { ClassificarDossieUseCase } from "../../../src/modules/classification/application/use-cases/ClassificarDossieUseCase.js";
import { GerarRecomendacoesUseCase } from "../../../src/modules/recommendation/application/use-cases/GerarRecomendacoesUseCase.js";
import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { ImportRow } from "../../../src/modules/import/domain/entities/ImportRow.js";
import { GetImportDashboardUseCase } from "../../../src/modules/import/application/use-cases/GetImportDashboardUseCase.js";
import { FakeDossieRepository } from "../dossie/fakes.js";
import { FakeImportBatchRepository, FakeImportRowRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const FINALIZADO_EM = new Date("2026-01-01T00:05:00Z");

function buildRow(overrides: Partial<Parameters<typeof ImportRow.create>[0]>): ImportRow {
  return ImportRow.create({
    id: "linha-1",
    importBatchId: "lote-1",
    numeroLinha: 14,
    status: "IMPORTADA",
    resolutionStatus: "PENDENTE",
    pessoaId: null,
    dossieId: null,
    documentoMascarado: "***.123.456-**",
    nome: "FULANO DE TAL",
    nomeFantasia: null,
    valorTotal: 100,
    valorDividaSelecionada: 100,
    naturezaDivida: null,
    motivo: null,
    createdAt: NOW,
    ...overrides,
  });
}

describe("GetImportDashboardUseCase", () => {
  it("lança NOT_FOUND quando o lote não existe", async () => {
    const useCase = new GetImportDashboardUseCase(
      new FakeImportBatchRepository(),
      new FakeImportRowRepository(),
      new ClassificarDossieUseCase(new FakeDossieRepository(), []),
      new GerarRecomendacoesUseCase(
        new ClassificarDossieUseCase(new FakeDossieRepository(), []),
        [],
      ),
    );

    await expect(useCase.execute("inexistente")).rejects.toThrow(
      "Lote de importação não encontrado",
    );
  });

  it("agrega contagens e distribuições apenas das linhas resolvidas", async () => {
    const dossieRepository = new FakeDossieRepository();
    const dossie = Dossie.criarVazio({
      id: "dossie-1",
      subjectType: "PESSOA",
      subjectId: "pessoa-1",
      now: NOW,
    });
    dossieRepository.seed(dossie);

    const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, []);
    const gerarRecomendacoesUseCase = new GerarRecomendacoesUseCase(classificarDossieUseCase, []);
    const classificacaoEsperada = await classificarDossieUseCase.execute("dossie-1");

    const batchRepository = new FakeImportBatchRepository();
    const batch = ImportBatch.create({
      id: "lote-1",
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: "teste.xlsx",
      iniciadoEm: NOW,
      finalizadoEm: FINALIZADO_EM,
      totalLinhas: 4,
      contagens: { importadas: 2, ignoradas: 1, invalidas: 0, duplicadas: 1, erros: 0 },
      status: "CONCLUIDO",
      revertidoEm: null,
      motivoReversao: null,
    });
    batchRepository.seed(batch);

    const rowRepository = new FakeImportRowRepository();
    rowRepository.seed(
      buildRow({
        id: "linha-resolvida",
        resolutionStatus: "RESOLVIDA",
        pessoaId: "pessoa-1",
        dossieId: "dossie-1",
      }),
    );
    rowRepository.seed(
      buildRow({ id: "linha-sem-correspondencia", resolutionStatus: "SEM_CORRESPONDENCIA" }),
    );
    rowRepository.seed(buildRow({ id: "linha-pendente", resolutionStatus: "PENDENTE" }));

    const useCase = new GetImportDashboardUseCase(
      batchRepository,
      rowRepository,
      classificarDossieUseCase,
      gerarRecomendacoesUseCase,
    );

    const dashboard = await useCase.execute("lote-1");

    expect(dashboard.quantidadeClientes).toBe(4);
    expect(dashboard.quantidadeDocumentosValidos).toBe(3);
    expect(dashboard.quantidadeDocumentosInvalidos).toBe(0);
    expect(dashboard.quantidadeDuplicada).toBe(1);
    expect(dashboard.quantidadeResolvidas).toBe(1);
    expect(dashboard.quantidadeDossies).toBe(1);
    expect(dashboard.quantidadeSemCorrespondencia).toBe(1);
    expect(dashboard.quantidadePendente).toBe(1);
    expect(dashboard.distribuicaoPorClassificacao).toEqual({ [classificacaoEsperada.classe]: 1 });
    expect(dashboard.tempoImportacaoMs).toBe(FINALIZADO_EM.getTime() - NOW.getTime());
  });

  it("devolve tempoImportacaoMs nulo quando o lote ainda não foi finalizado", async () => {
    const batchRepository = new FakeImportBatchRepository();
    batchRepository.seed(
      ImportBatch.create({
        id: "lote-2",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "teste.xlsx",
        iniciadoEm: NOW,
        finalizadoEm: null,
        totalLinhas: 0,
        contagens: { importadas: 0, ignoradas: 0, invalidas: 0, duplicadas: 0, erros: 0 },
        status: "CONCLUIDO",
        revertidoEm: null,
        motivoReversao: null,
      }),
    );
    const dossieRepository = new FakeDossieRepository();
    const classificarDossieUseCase = new ClassificarDossieUseCase(dossieRepository, []);

    const useCase = new GetImportDashboardUseCase(
      batchRepository,
      new FakeImportRowRepository(),
      classificarDossieUseCase,
      new GerarRecomendacoesUseCase(classificarDossieUseCase, []),
    );

    const dashboard = await useCase.execute("lote-2");

    expect(dashboard.tempoImportacaoMs).toBeNull();
  });
});
