import {
  Case,
  InvalidCaseTransitionError,
} from "../../../src/modules/case-management/domain/entities/Case.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const LATER = new Date("2026-01-02T00:00:00Z");

describe("Case", () => {
  it("abre um case no status ABERTO com prioridade e owner informados", () => {
    const caso = Case.abrir({
      id: "c1",
      dossieId: "d1",
      ownerId: "user-1",
      priority: "ALTA",
      now: NOW,
    });

    expect(caso.status).toBe("ABERTO");
    expect(caso.ownerId).toBe("user-1");
    expect(caso.priority).toBe("ALTA");
    expect(caso.tags).toEqual([]);
  });

  it("permite transições válidas", () => {
    const caso = Case.abrir({
      id: "c1",
      dossieId: "d1",
      ownerId: null,
      priority: "MEDIA",
      now: NOW,
    });

    caso.transicionarStatus("EM_ANDAMENTO", LATER);

    expect(caso.status).toBe("EM_ANDAMENTO");
    expect(caso.updatedAt).toEqual(LATER);
  });

  it("rejeita transições inválidas", () => {
    const caso = Case.abrir({
      id: "c1",
      dossieId: "d1",
      ownerId: null,
      priority: "MEDIA",
      now: NOW,
    });

    expect(() => caso.transicionarStatus("RESOLVIDO", LATER)).toThrow(InvalidCaseTransitionError);
  });

  it("RESOLVIDO e CANCELADO são terminais — nenhuma transição de saída", () => {
    const caso = Case.abrir({
      id: "c1",
      dossieId: "d1",
      ownerId: null,
      priority: "MEDIA",
      now: NOW,
    });
    caso.transicionarStatus("EM_ANDAMENTO", NOW);
    caso.transicionarStatus("RESOLVIDO", NOW);

    expect(() => caso.transicionarStatus("EM_ANDAMENTO", LATER)).toThrow(
      InvalidCaseTransitionError,
    );
  });

  it("atualiza owner, prioridade, tags e próxima ação", () => {
    const caso = Case.abrir({
      id: "c1",
      dossieId: "d1",
      ownerId: null,
      priority: "MEDIA",
      now: NOW,
    });

    caso.atualizarOwner("user-2", LATER);
    caso.atualizarPrioridade("URGENTE", LATER);
    caso.atualizarTags(["vip", "reincidente"], LATER);
    caso.definirProximaAcao("Ligar novamente", LATER, LATER);

    expect(caso.ownerId).toBe("user-2");
    expect(caso.priority).toBe("URGENTE");
    expect(caso.tags).toEqual(["vip", "reincidente"]);
    expect(caso.proximaAcao).toBe("Ligar novamente");
    expect(caso.dataProximaAcao).toEqual(LATER);
  });
});
