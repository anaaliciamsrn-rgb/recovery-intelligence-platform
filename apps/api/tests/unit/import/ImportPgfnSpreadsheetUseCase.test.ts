import { ImportRow } from "../../../src/modules/import/domain/entities/ImportRow.js";
import { ImportPgfnSpreadsheetUseCase } from "../../../src/modules/import/application/use-cases/ImportPgfnSpreadsheetUseCase.js";
import type { ParsedImportRow } from "../../../src/modules/import/application/ports/IImportSourceParser.js";
import {
  FakeClock,
  FakeIdGenerator,
  FakeImportBatchRepository,
  FakeImportRowRepository,
  FakeImportSourceParser,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildRow(overrides: Partial<ParsedImportRow>): ParsedImportRow {
  return {
    numeroLinha: 1,
    documento: null,
    nome: null,
    nomeFantasia: null,
    valorTotal: null,
    valorDividaSelecionada: null,
    naturezaDivida: null,
    ...overrides,
  };
}

function buildUseCase(rows: ParsedImportRow[], rowRepository = new FakeImportRowRepository()) {
  const parser = new FakeImportSourceParser({ fonte: "PGFN_LISTA_DEVEDORES", rows });
  const batchRepository = new FakeImportBatchRepository();
  const useCase = new ImportPgfnSpreadsheetUseCase(
    parser,
    batchRepository,
    rowRepository,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
  return { useCase, batchRepository, rowRepository };
}

describe("ImportPgfnSpreadsheetUseCase", () => {
  it("marca como IMPORTADA uma linha válida", async () => {
    const { useCase, rowRepository } = buildUseCase([
      buildRow({
        numeroLinha: 14,
        documento: "***.123.456-**",
        nome: "FULANO DE TAL",
        valorTotal: "1000.50",
      }),
    ]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.importadas).toBe(1);
    const linhas = await rowRepository.findByImportBatchId(resultado.importBatchId);
    expect(linhas[0]?.status).toBe("IMPORTADA");
    expect(linhas[0]?.valorTotal).toBe(1000.5);
  });

  it("marca como IGNORADA uma linha completamente vazia", async () => {
    const { useCase } = buildUseCase([buildRow({ numeroLinha: 17 })]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.ignoradas).toBe(1);
  });

  it("marca como INVALIDA uma linha sem nome", async () => {
    const { useCase } = buildUseCase([
      buildRow({ documento: "***.123.456-**", valorTotal: "100" }),
    ]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.invalidas).toBe(1);
  });

  it("marca como INVALIDA uma linha sem documento", async () => {
    const { useCase } = buildUseCase([buildRow({ nome: "FULANO DE TAL", valorTotal: "100" })]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.invalidas).toBe(1);
  });

  it("marca como INVALIDA um documento fora do formato mascarado esperado", async () => {
    const { useCase } = buildUseCase([
      buildRow({ documento: "529.982.247-25", nome: "FULANO DE TAL" }),
    ]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.invalidas).toBe(1);
  });

  it("marca como ERRO um valor monetário não numérico", async () => {
    const { useCase } = buildUseCase([
      buildRow({ documento: "***.123.456-**", nome: "FULANO DE TAL", valorTotal: "não é número" }),
    ]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.erros).toBe(1);
  });

  it("marca como DUPLICADA a segunda ocorrência do mesmo documento no mesmo lote", async () => {
    const { useCase } = buildUseCase([
      buildRow({
        numeroLinha: 14,
        documento: "***.123.456-**",
        nome: "FULANO DE TAL",
        valorTotal: "100",
      }),
      buildRow({
        numeroLinha: 15,
        documento: "***.123.456-**",
        nome: "FULANO DE TAL",
        valorTotal: "200",
      }),
    ]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.importadas).toBe(1);
    expect(resultado.contagens.duplicadas).toBe(1);
  });

  it("marca como DUPLICADA um documento já importado num lote anterior", async () => {
    const rowRepository = new FakeImportRowRepository();
    rowRepository.seed(
      ImportRow.create({
        id: "linha-anterior",
        importBatchId: "lote-anterior",
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
      }),
    );
    const { useCase } = buildUseCase(
      [buildRow({ documento: "***.123.456-**", nome: "FULANO DE TAL", valorTotal: "100" })],
      rowRepository,
    );

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.contagens.duplicadas).toBe(1);
    expect(resultado.contagens.importadas).toBe(0);
  });

  it("continua processando as demais linhas mesmo quando uma falha", async () => {
    const { useCase } = buildUseCase([
      buildRow({ numeroLinha: 14, nome: "SEM DOCUMENTO" }),
      buildRow({
        numeroLinha: 15,
        documento: "***.999.888-**",
        nome: "COM DOCUMENTO VALIDO",
        valorTotal: "50",
      }),
    ]);

    const resultado = await useCase.execute({
      fileBuffer: Buffer.from(""),
      nomeArquivo: "teste.xlsx",
    });

    expect(resultado.totalLinhas).toBe(2);
    expect(resultado.contagens.invalidas).toBe(1);
    expect(resultado.contagens.importadas).toBe(1);
  });
});
