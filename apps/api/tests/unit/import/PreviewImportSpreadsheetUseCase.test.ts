import { ImportRow } from "../../../src/modules/import/domain/entities/ImportRow.js";
import { PreviewImportSpreadsheetUseCase } from "../../../src/modules/import/application/use-cases/PreviewImportSpreadsheetUseCase.js";
import type { ParsedImportRow } from "../../../src/modules/import/application/ports/IImportSourceParser.js";
import { FakeImportRowRepository, FakeImportSourceParser } from "./fakes.js";

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
  return new PreviewImportSpreadsheetUseCase(parser, rowRepository);
}

/**
 * Espelha `ImportPgfnSpreadsheetUseCase.test.ts` propositalmente — o
 * preview precisa concluir exatamente às mesmas decisões que a importação
 * real chegaria, mas sem persistir nada. Ver ADR 0034.
 */
describe("PreviewImportSpreadsheetUseCase", () => {
  it("nunca persiste nada — só inspeciona o repositório para deduplicação, nunca escreve", async () => {
    const rowRepository = new FakeImportRowRepository();
    const useCase = buildUseCase(
      [buildRow({ documento: "***.123.456-**", nome: "FULANO DE TAL", valorTotal: "100" })],
      rowRepository,
    );

    await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(await rowRepository.findByImportBatchId("qualquer-lote")).toHaveLength(0);
  });

  it("marca IMPORTAVEL uma linha válida", async () => {
    const useCase = buildUseCase([
      buildRow({
        numeroLinha: 14,
        documento: "***.123.456-**",
        nome: "FULANO DE TAL",
        valorTotal: "1000.50",
      }),
    ]);

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.importaveis).toBe(1);
    expect(resultado.linhas[0]).toMatchObject({
      numeroLinha: 14,
      status: "IMPORTAVEL",
      nome: "FULANO DE TAL",
    });
  });

  it("marca IGNORADA uma linha completamente vazia", async () => {
    const useCase = buildUseCase([buildRow({ numeroLinha: 17 })]);

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.ignoradas).toBe(1);
  });

  it("marca INVALIDA uma linha sem nome ou sem documento", async () => {
    const useCase = buildUseCase([
      buildRow({ documento: "***.123.456-**", valorTotal: "100" }),
      buildRow({ nome: "FULANO DE TAL", valorTotal: "100" }),
    ]);

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.invalidas).toBe(2);
  });

  it("marca INVALIDA um documento fora do formato mascarado esperado", async () => {
    const useCase = buildUseCase([
      buildRow({ documento: "529.982.247-25", nome: "FULANO DE TAL" }),
    ]);

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.invalidas).toBe(1);
  });

  it("marca ERRO um valor monetário não numérico", async () => {
    const useCase = buildUseCase([
      buildRow({ documento: "***.123.456-**", nome: "FULANO DE TAL", valorTotal: "não é número" }),
    ]);

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.erros).toBe(1);
  });

  it("marca DUPLICADA a segunda ocorrência do mesmo documento no mesmo lote", async () => {
    const useCase = buildUseCase([
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

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.importaveis).toBe(1);
    expect(resultado.contagens.duplicadas).toBe(1);
  });

  it("marca DUPLICADA um documento já importado num lote anterior (detecção cross-batch, só leitura)", async () => {
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
    const useCase = buildUseCase(
      [buildRow({ documento: "***.123.456-**", nome: "FULANO DE TAL", valorTotal: "100" })],
      rowRepository,
    );

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.contagens.duplicadas).toBe(1);
    expect(resultado.contagens.importaveis).toBe(0);
  });

  it("continua avaliando as demais linhas mesmo quando uma delas é inválida", async () => {
    const useCase = buildUseCase([
      buildRow({ numeroLinha: 14, nome: "SEM DOCUMENTO" }),
      buildRow({
        numeroLinha: 15,
        documento: "***.999.888-**",
        nome: "COM DOCUMENTO VALIDO",
        valorTotal: "50",
      }),
    ]);

    const resultado = await useCase.execute({ fileBuffer: Buffer.from("") });

    expect(resultado.totalLinhas).toBe(2);
    expect(resultado.contagens.invalidas).toBe(1);
    expect(resultado.contagens.importaveis).toBe(1);
  });
});
