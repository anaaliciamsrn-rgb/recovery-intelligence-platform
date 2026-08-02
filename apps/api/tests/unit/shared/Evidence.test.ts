import { ConfidenceScore } from "../../../src/domain/value-objects/ConfidenceScore.js";
import { Evidence } from "../../../src/domain/value-objects/Evidence.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const ALTA_CONFIANCA = ConfidenceScore.create(0.9);

/**
 * Nota: `pnpm typecheck` não inclui `tests/` (gap conhecido, registrado no
 * backlog técnico da fundação) — por isso estes testes verificam a
 * diferenciação dos quatro estados em tempo de execução (via `status` e
 * narrowing), não via `@ts-expect-error` (que não seria de fato checado
 * neste projeto hoje).
 */
describe("Evidence", () => {
  it("cria uma evidência ENCONTRADO com valor e confiança", () => {
    const evidence = Evidence.encontrada({
      valor: "Ativo",
      fonte: "RECEITA_FEDERAL",
      dataConsulta: NOW,
      confidenceScore: ALTA_CONFIANCA,
    });

    expect(evidence.status).toBe("ENCONTRADO");
    if (evidence.status !== "ENCONTRADO") throw new Error("esperava ENCONTRADO");
    expect(evidence.valor).toBe("Ativo");
    expect(evidence.confidenceScore.toNumber()).toBe(0.9);
  });

  it("cria uma evidência NAO_ENCONTRADO sem nenhum campo de 'valor'", () => {
    const evidence = Evidence.naoEncontrada({
      fonte: "PGFN",
      dataConsulta: NOW,
      confidenceScore: ALTA_CONFIANCA,
    });

    expect(evidence.status).toBe("NAO_ENCONTRADO");
    expect("valor" in evidence).toBe(false);
  });

  it("cria uma evidência NAO_CONSULTADO sem data de consulta nem confiança", () => {
    const evidence = Evidence.naoConsultada({ fonte: "DATAJUD" });

    expect(evidence.status).toBe("NAO_CONSULTADO");
    expect("dataConsulta" in evidence).toBe(false);
    expect("confidenceScore" in evidence).toBe(false);
    expect("valor" in evidence).toBe(false);
  });

  it("cria uma evidência ERRO_CONSULTA com motivo, sem valor nem confiança", () => {
    const evidence = Evidence.comErro({
      fonte: "CENPROT",
      dataConsulta: NOW,
      motivoErro: "Timeout ao consultar o serviço externo",
    });

    expect(evidence.status).toBe("ERRO_CONSULTA");
    if (evidence.status !== "ERRO_CONSULTA") throw new Error("esperava ERRO_CONSULTA");
    expect(evidence.motivoErro).toBe("Timeout ao consultar o serviço externo");
    expect("valor" in evidence).toBe(false);
    expect("confidenceScore" in evidence).toBe(false);
  });

  it("NAO_ENCONTRADO e ERRO_CONSULTA nunca são o mesmo status, mesmo com a mesma fonte/data", () => {
    const naoEncontrado = Evidence.naoEncontrada({
      fonte: "RECEITA_FEDERAL",
      dataConsulta: NOW,
      confidenceScore: ALTA_CONFIANCA,
    });
    const erro = Evidence.comErro({
      fonte: "RECEITA_FEDERAL",
      dataConsulta: NOW,
      motivoErro: "falha",
    });

    expect(naoEncontrado.status).not.toBe(erro.status);
  });

  it("os quatro status são mutuamente exclusivos (switch exaustivo sem fallback)", () => {
    function describe(evidence: Evidence<string>): string {
      switch (evidence.status) {
        case "ENCONTRADO":
          return `encontrado: ${evidence.valor}`;
        case "NAO_ENCONTRADO":
          return "não encontrado";
        case "NAO_CONSULTADO":
          return "não consultado";
        case "ERRO_CONSULTA":
          return `erro: ${evidence.motivoErro}`;
      }
    }

    expect(
      describe(
        Evidence.encontrada({
          valor: "x",
          fonte: "F",
          dataConsulta: NOW,
          confidenceScore: ALTA_CONFIANCA,
        }),
      ),
    ).toBe("encontrado: x");
    expect(
      describe(
        Evidence.naoEncontrada({ fonte: "F", dataConsulta: NOW, confidenceScore: ALTA_CONFIANCA }),
      ),
    ).toBe("não encontrado");
    expect(describe(Evidence.naoConsultada({ fonte: "F" }))).toBe("não consultado");
    expect(describe(Evidence.comErro({ fonte: "F", dataConsulta: NOW, motivoErro: "x" }))).toBe(
      "erro: x",
    );
  });
});
