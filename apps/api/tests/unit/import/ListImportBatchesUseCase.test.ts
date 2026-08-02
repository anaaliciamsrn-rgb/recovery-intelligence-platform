import { ImportBatch } from "../../../src/modules/import/domain/entities/ImportBatch.js";
import { ListImportBatchesUseCase } from "../../../src/modules/import/application/use-cases/ListImportBatchesUseCase.js";
import { FakeImportBatchRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("ListImportBatchesUseCase", () => {
  it("lista todos os lotes já criados (histórico de importações)", async () => {
    const batchRepository = new FakeImportBatchRepository();
    batchRepository.seed(
      ImportBatch.iniciar({
        id: "lote-1",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "a.xlsx",
        totalLinhas: 1,
        now: NOW,
      }),
    );
    batchRepository.seed(
      ImportBatch.iniciar({
        id: "lote-2",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "b.xlsx",
        totalLinhas: 2,
        now: NOW,
      }),
    );
    const useCase = new ListImportBatchesUseCase(batchRepository);

    const pagina = await useCase.execute();

    expect(pagina.items).toHaveLength(2);
    expect(pagina.total).toBe(2);
    expect(pagina.items.map((l) => l.id).sort()).toEqual(["lote-1", "lote-2"]);
  });

  it("devolve página vazia quando nenhum lote foi criado ainda", async () => {
    const useCase = new ListImportBatchesUseCase(new FakeImportBatchRepository());
    const pagina = await useCase.execute();
    expect(pagina.items).toEqual([]);
    expect(pagina.total).toBe(0);
  });

  it("pagina os resultados", async () => {
    const batchRepository = new FakeImportBatchRepository();
    batchRepository.seed(
      ImportBatch.iniciar({
        id: "lote-1",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "a.xlsx",
        totalLinhas: 1,
        now: NOW,
      }),
    );
    batchRepository.seed(
      ImportBatch.iniciar({
        id: "lote-2",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "b.xlsx",
        totalLinhas: 2,
        now: NOW,
      }),
    );
    batchRepository.seed(
      ImportBatch.iniciar({
        id: "lote-3",
        fonte: "PGFN_LISTA_DEVEDORES",
        nomeArquivo: "c.xlsx",
        totalLinhas: 3,
        now: NOW,
      }),
    );
    const useCase = new ListImportBatchesUseCase(batchRepository);

    const primeiraPagina = await useCase.execute({ page: 1, pageSize: 2 });
    expect(primeiraPagina.items).toHaveLength(2);
    expect(primeiraPagina.total).toBe(3);
  });
});
