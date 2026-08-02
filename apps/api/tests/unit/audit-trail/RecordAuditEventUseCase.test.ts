import { RecordAuditEventUseCase } from "../../../src/modules/audit-trail/application/use-cases/RecordAuditEventUseCase.js";
import { FakeAuditEventRepository, FakeClock, FakeIdGenerator } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

describe("RecordAuditEventUseCase", () => {
  it("gera id e timestamp e persiste o evento", async () => {
    const repository = new FakeAuditEventRepository();
    const useCase = new RecordAuditEventUseCase(
      repository,
      new FakeIdGenerator(),
      new FakeClock(NOW),
    );

    await useCase.execute({
      usuarioId: "user-1",
      entidade: "Pessoa",
      entidadeId: "pessoa-1",
      tipo: "PESSOA_CRIADA",
      payload: { request: {}, response: { id: "pessoa-1" } },
      requestId: "req-1",
      ip: "127.0.0.1",
      userAgent: "jest",
      duracaoMs: 12,
      outcome: "SUCESSO",
      mensagem: "Pessoa criada com sucesso",
    });

    const persistido = await repository.findById("id-1");
    expect(persistido).not.toBeNull();
    expect(persistido?.timestamp).toEqual(NOW);
    expect(persistido?.entidadeId).toBe("pessoa-1");
    expect(persistido?.outcome).toBe("SUCESSO");
  });
});
