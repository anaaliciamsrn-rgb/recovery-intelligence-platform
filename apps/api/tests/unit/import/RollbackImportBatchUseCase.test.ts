import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { RollbackImportBatchUseCase } from "../../../src/modules/import/application/use-cases/RollbackImportBatchUseCase.js";
import { FakeClock, FakeImportBatchRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("RollbackImportBatchUseCase", () => {
  it("reverte um lote existente e persiste a mudança", async () => {
    const batchRepository = new FakeImportBatchRepository();
    batchRepository.seed(
      ImportBatch.iniciar({
        id: "lote-1",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "teste.xlsx",
        totalLinhas: 5,
        now: NOW,
      }),
    );
    const useCase = new RollbackImportBatchUseCase(batchRepository, new FakeClock(NOW));

    const revertido = await useCase.execute({
      importBatchId: "lote-1",
      motivo: "Duplicado por engano",
    });

    expect(revertido.status).toBe("REVERTIDO");
    const persistido = await batchRepository.findById("lote-1");
    expect(persistido?.status).toBe("REVERTIDO");
    expect(persistido?.motivoReversao).toBe("Duplicado por engano");
  });

  it("nunca apaga o lote nem altera totalLinhas/contagens", async () => {
    const batchRepository = new FakeImportBatchRepository();
    const batch = ImportBatch.iniciar({
      id: "lote-1",
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: "teste.xlsx",
      totalLinhas: 5,
      now: NOW,
    });
    batch.registrarContagem("importadas");
    batchRepository.seed(batch);
    const useCase = new RollbackImportBatchUseCase(batchRepository, new FakeClock(NOW));

    const revertido = await useCase.execute({ importBatchId: "lote-1", motivo: "x" });

    expect(revertido.totalLinhas).toBe(5);
    expect(revertido.contagens.importadas).toBe(1);
  });

  it("lança NOT_FOUND quando o lote não existe", async () => {
    const useCase = new RollbackImportBatchUseCase(
      new FakeImportBatchRepository(),
      new FakeClock(NOW),
    );
    await expect(
      useCase.execute({ importBatchId: "inexistente", motivo: "x" }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });

  it("lança CONFLICT ao tentar reverter um lote já revertido", async () => {
    const batchRepository = new FakeImportBatchRepository();
    const batch = ImportBatch.iniciar({
      id: "lote-1",
      fonte: "PGFN_LISTA_DEVEDORES",
      nomeArquivo: "teste.xlsx",
      totalLinhas: 0,
      now: NOW,
    });
    batch.reverter("primeira reversão", NOW);
    batchRepository.seed(batch);
    const useCase = new RollbackImportBatchUseCase(batchRepository, new FakeClock(NOW));

    await expect(
      useCase.execute({ importBatchId: "lote-1", motivo: "segunda tentativa" }),
    ).rejects.toMatchObject({ kind: "CONFLICT" });
  });
});
