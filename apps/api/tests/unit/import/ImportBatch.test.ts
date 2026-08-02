import {
  ImportBatch,
  InvalidImportBatchTransitionError,
} from "../../../src/modules/import/domain/entities/ImportBatch.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("ImportBatch — reverter() (Etapa 15, ADR 0034)", () => {
  it("iniciar() nasce CONCLUIDO, sem reversão", () => {
    const batch = ImportBatch.iniciar({
      id: "lote-1",
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: "teste.xlsx",
      totalLinhas: 0,
      now: NOW,
    });

    expect(batch.status).toBe("CONCLUIDO");
    expect(batch.revertidoEm).toBeNull();
    expect(batch.motivoReversao).toBeNull();
  });

  it("reverter() marca REVERTIDO com motivo e timestamp, sem alterar contagens/totalLinhas", () => {
    const batch = ImportBatch.iniciar({
      id: "lote-1",
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: "teste.xlsx",
      totalLinhas: 10,
      now: NOW,
    });
    batch.registrarContagem("importadas");
    const quando = new Date("2026-01-02T00:00:00Z");

    batch.reverter("Arquivo enviado por engano", quando);

    expect(batch.status).toBe("REVERTIDO");
    expect(batch.revertidoEm).toEqual(quando);
    expect(batch.motivoReversao).toBe("Arquivo enviado por engano");
    expect(batch.totalLinhas).toBe(10);
    expect(batch.contagens.importadas).toBe(1);
  });

  it("reverter() um lote já revertido lança InvalidImportBatchTransitionError", () => {
    const batch = ImportBatch.iniciar({
      id: "lote-1",
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: "teste.xlsx",
      totalLinhas: 0,
      now: NOW,
    });
    batch.reverter("primeiro motivo", NOW);

    expect(() => batch.reverter("segundo motivo", NOW)).toThrow(InvalidImportBatchTransitionError);
  });
});
