import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { ImportRow } from "../../../src/modules/import/domain/entities/ImportRow.js";
import { GetImportReportUseCase } from "../../../src/modules/import/application/use-cases/GetImportReportUseCase.js";
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

function buildBatch(): ImportBatch {
  return ImportBatch.create({
    id: "lote-1",
    fonte: "PGFN_LISTA_DEVEDORES",
    nomeArquivo: "teste.xlsx",
    iniciadoEm: NOW,
    finalizadoEm: FINALIZADO_EM,
    totalLinhas: 4,
    contagens: { importadas: 1, ignoradas: 1, invalidas: 1, duplicadas: 1, erros: 0 },
    status: "CONCLUIDO",
    revertidoEm: null,
    motivoReversao: null,
  });
}

describe("GetImportReportUseCase", () => {
  it("lança NOT_FOUND quando o lote não existe", async () => {
    const useCase = new GetImportReportUseCase(
      new FakeImportBatchRepository(),
      new FakeImportRowRepository(),
    );

    await expect(useCase.execute("inexistente")).rejects.toThrow(
      "Lote de importação não encontrado",
    );
  });

  it("separa clientes importados (IMPORTADA/DUPLICADA) de rejeitados (INVALIDA/IGNORADA/ERRO)", async () => {
    const batchRepository = new FakeImportBatchRepository();
    batchRepository.seed(buildBatch());

    const rowRepository = new FakeImportRowRepository();
    rowRepository.seed(buildRow({ id: "linha-importada", status: "IMPORTADA" }));
    rowRepository.seed(
      buildRow({ id: "linha-duplicada", status: "DUPLICADA", motivo: "Documento já importado" }),
    );
    rowRepository.seed(
      buildRow({ id: "linha-invalida", status: "INVALIDA", motivo: "Nome ausente" }),
    );
    rowRepository.seed(buildRow({ id: "linha-ignorada", status: "IGNORADA" }));

    const useCase = new GetImportReportUseCase(batchRepository, rowRepository);

    const relatorio = await useCase.execute("lote-1");

    expect(relatorio.nomeArquivo).toBe("teste.xlsx");
    expect(relatorio.fonte).toBe("PGFN_LISTA_DEVEDORES");
    expect(relatorio.clientesImportados.map((r) => r.numeroLinha).sort()).toEqual([14, 14]);
    expect(relatorio.clientesImportados).toHaveLength(2);
    expect(relatorio.clientesRejeitados).toHaveLength(2);
    expect(relatorio.clientesRejeitados.find((r) => r.status === "INVALIDA")?.motivo).toBe(
      "Nome ausente",
    );
    expect(relatorio.resumoExecutivo).toContain("teste.xlsx");
    expect(relatorio.resumoExecutivo).toContain("PGFN_LISTA_DEVEDORES");
  });

  it("resume corretamente o status de resolução de identidade no texto executivo", async () => {
    const batchRepository = new FakeImportBatchRepository();
    batchRepository.seed(buildBatch());

    const rowRepository = new FakeImportRowRepository();
    rowRepository.seed(buildRow({ id: "linha-resolvida", resolutionStatus: "RESOLVIDA" }));
    rowRepository.seed(
      buildRow({ id: "linha-sem-correspondencia", resolutionStatus: "SEM_CORRESPONDENCIA" }),
    );
    rowRepository.seed(buildRow({ id: "linha-pendente", resolutionStatus: "PENDENTE" }));

    const useCase = new GetImportReportUseCase(batchRepository, rowRepository);

    const relatorio = await useCase.execute("lote-1");

    expect(relatorio.resumoExecutivo).toContain("correspondência confirmada em 1 caso(s)");
    expect(relatorio.resumoExecutivo).toContain("1 ficaram sem correspondência");
    expect(relatorio.resumoExecutivo).toContain("1 ainda não tiveram a identidade resolvida");
  });
});
