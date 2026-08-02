import {
  AuditEvent,
  InvalidAuditEventError,
} from "../../../src/modules/audit-trail/domain/entities/AuditEvent.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildProps(overrides: Partial<Parameters<typeof AuditEvent.create>[0]> = {}) {
  return {
    id: "evt-1",
    timestamp: NOW,
    usuarioId: "user-1",
    entidade: "Pessoa",
    entidadeId: "pessoa-1",
    tipo: "PESSOA_CRIADA" as const,
    payload: { request: {}, response: { id: "pessoa-1" } },
    requestId: "req-1",
    ip: "127.0.0.1",
    userAgent: "jest",
    duracaoMs: 42,
    outcome: "SUCESSO" as const,
    mensagem: "Pessoa criada com sucesso",
    ...overrides,
  };
}

describe("AuditEvent", () => {
  it("cria um evento válido e expõe todos os campos via getters", () => {
    const event = AuditEvent.create(buildProps());

    expect(event.id).toBe("evt-1");
    expect(event.timestamp).toEqual(NOW);
    expect(event.usuarioId).toBe("user-1");
    expect(event.entidade).toBe("Pessoa");
    expect(event.entidadeId).toBe("pessoa-1");
    expect(event.tipo).toBe("PESSOA_CRIADA");
    expect(event.payload).toEqual({ request: {}, response: { id: "pessoa-1" } });
    expect(event.requestId).toBe("req-1");
    expect(event.ip).toBe("127.0.0.1");
    expect(event.userAgent).toBe("jest");
    expect(event.duracaoMs).toBe(42);
    expect(event.outcome).toBe("SUCESSO");
    expect(event.mensagem).toBe("Pessoa criada com sucesso");
  });

  it("aceita usuarioId e entidadeId nulos", () => {
    const event = AuditEvent.create(buildProps({ usuarioId: null, entidadeId: null }));

    expect(event.usuarioId).toBeNull();
    expect(event.entidadeId).toBeNull();
  });

  it("rejeita duração negativa", () => {
    expect(() => AuditEvent.create(buildProps({ duracaoMs: -1 }))).toThrow(InvalidAuditEventError);
  });

  it("toProps devolve uma cópia imutável do estado", () => {
    const event = AuditEvent.create(buildProps());

    expect(event.toProps()).toEqual(buildProps());
  });
});
