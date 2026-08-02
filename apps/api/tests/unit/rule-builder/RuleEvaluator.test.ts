import { RuleDefinition } from "../../../src/modules/rule-builder/domain/entities/RuleDefinition.js";
import { RuleEvaluator } from "../../../src/modules/rule-builder/domain/services/RuleEvaluator.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildRegra(overrides: Partial<Parameters<typeof RuleDefinition.create>[0]> = {}) {
  return RuleDefinition.create({
    id: overrides.id ?? "rule-1",
    nome: overrides.nome ?? "Regra",
    descricao: null,
    recurso: overrides.recurso ?? "classificacao",
    condicoes: overrides.condicoes ?? [{ campo: "diasAtraso", operador: "MAIOR_QUE", valor: 90 }],
    peso: overrides.peso ?? 10,
    prioridade: overrides.prioridade ?? 1,
    acao: overrides.acao ?? "AUMENTAR_RISCO",
    ativo: overrides.ativo ?? true,
    versaoAtual: 1,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe("RuleEvaluator", () => {
  it("casa uma regra cuja condição é satisfeita", () => {
    const regra = buildRegra();
    const resultado = RuleEvaluator.avaliar([regra], { diasAtraso: 120 });

    expect(resultado.regrasCasadas).toHaveLength(1);
    expect(resultado.regrasCasadas[0]?.regra.id).toBe("rule-1");
    expect(resultado.pontuacaoTotal).toBe(10);
  });

  it("não casa uma regra cuja condição não é satisfeita", () => {
    const regra = buildRegra();
    const resultado = RuleEvaluator.avaliar([regra], { diasAtraso: 10 });

    expect(resultado.regrasCasadas).toHaveLength(0);
    expect(resultado.pontuacaoTotal).toBe(0);
  });

  it("exige todas as condições satisfeitas (semântica E)", () => {
    const regra = buildRegra({
      condicoes: [
        { campo: "diasAtraso", operador: "MAIOR_QUE", valor: 90 },
        { campo: "valorDivida", operador: "MAIOR_QUE", valor: 5000 },
      ],
    });

    expect(
      RuleEvaluator.avaliar([regra], { diasAtraso: 120, valorDivida: 1000 }).regrasCasadas,
    ).toHaveLength(0);
    expect(
      RuleEvaluator.avaliar([regra], { diasAtraso: 120, valorDivida: 6000 }).regrasCasadas,
    ).toHaveLength(1);
  });

  it("nunca casa uma regra inativa, mesmo que a condição seja satisfeita", () => {
    const regra = buildRegra({ ativo: false });
    expect(RuleEvaluator.avaliar([regra], { diasAtraso: 120 }).regrasCasadas).toHaveLength(0);
  });

  it("ordena regras casadas por prioridade desc, depois peso desc", () => {
    const baixa = buildRegra({ id: "baixa", prioridade: 1, peso: 100 });
    const alta = buildRegra({ id: "alta", prioridade: 5, peso: 1 });
    const mediaPesoMaior = buildRegra({ id: "media-peso-maior", prioridade: 1, peso: 200 });

    const resultado = RuleEvaluator.avaliar([baixa, alta, mediaPesoMaior], { diasAtraso: 120 });

    expect(resultado.regrasCasadas.map((match) => match.regra.id)).toEqual([
      "alta",
      "media-peso-maior",
      "baixa",
    ]);
  });

  it("soma o peso de todas as regras casadas na pontuacaoTotal", () => {
    const regraA = buildRegra({ id: "a", peso: 10 });
    const regraB = buildRegra({ id: "b", peso: 25 });

    const resultado = RuleEvaluator.avaliar([regraA, regraB], { diasAtraso: 120 });

    expect(resultado.pontuacaoTotal).toBe(35);
  });

  it("operador IGUAL/DIFERENTE comparam por igualdade estrita", () => {
    const igual = buildRegra({
      id: "igual",
      condicoes: [{ campo: "status", operador: "IGUAL", valor: "VENCIDO" }],
    });
    const diferente = buildRegra({
      id: "diferente",
      condicoes: [{ campo: "status", operador: "DIFERENTE", valor: "VENCIDO" }],
    });

    expect(RuleEvaluator.avaliar([igual], { status: "VENCIDO" }).regrasCasadas).toHaveLength(1);
    expect(RuleEvaluator.avaliar([igual], { status: "PAGO" }).regrasCasadas).toHaveLength(0);
    expect(RuleEvaluator.avaliar([diferente], { status: "PAGO" }).regrasCasadas).toHaveLength(1);
  });
});
