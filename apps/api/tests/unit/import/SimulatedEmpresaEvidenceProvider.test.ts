import { SimulatedEmpresaEvidenceProvider } from "../../../src/modules/import/infrastructure/SimulatedEmpresaEvidenceProvider.js";

describe("SimulatedEmpresaEvidenceProvider", () => {
  it("é determinístico: o mesmo CNPJ produz sempre a mesma simulação", () => {
    const provider = new SimulatedEmpresaEvidenceProvider();

    const primeira = provider.simulate("11222333000181");
    const segunda = provider.simulate("11222333000181");

    expect(primeira).toEqual(segunda);
  });

  it("CNPJs diferentes tendem a produzir simulações diferentes", () => {
    const provider = new SimulatedEmpresaEvidenceProvider();

    const a = provider.simulate("11222333000181");
    const b = provider.simulate("99888777000122");

    expect(a).not.toEqual(b);
  });

  it("PGFN, DataJud e Receita Federal são sempre ENCONTRADO com o formato consumido pelas regras de classificação", () => {
    const provider = new SimulatedEmpresaEvidenceProvider();
    const evidencias = provider.simulate("11222333000181");

    expect(evidencias.PGFN.status).toBe("ENCONTRADO");
    expect(typeof (evidencias.PGFN.valor as { temPendencia: unknown }).temPendencia).toBe(
      "boolean",
    );
    expect(evidencias.PGFN.confidenceScore).not.toBeNull();

    expect(evidencias.DATAJUD.status).toBe("ENCONTRADO");
    expect(typeof (evidencias.DATAJUD.valor as { temProcesso: unknown }).temProcesso).toBe(
      "boolean",
    );

    expect(evidencias.RECEITA_FEDERAL.status).toBe("ENCONTRADO");
    expect(
      typeof (evidencias.RECEITA_FEDERAL.valor as { situacaoCadastral: unknown }).situacaoCadastral,
    ).toBe("string");
  });

  it("produz uma distribuição variada de classes de risco ao longo de muitos CNPJs (nunca tudo igual)", () => {
    const provider = new SimulatedEmpresaEvidenceProvider();
    const pendencias = new Set<boolean>();

    for (let i = 0; i < 200; i += 1) {
      const evidencias = provider.simulate(`CNPJ-SIMULADO-${i}`);
      pendencias.add((evidencias.PGFN.valor as { temPendencia: boolean }).temPendencia);
    }

    expect(pendencias.has(true)).toBe(true);
    expect(pendencias.has(false)).toBe(true);
  });

  it("confidenceScore é sempre nulo quando o status é ERRO_CONSULTA", () => {
    const provider = new SimulatedEmpresaEvidenceProvider();

    for (let i = 0; i < 500; i += 1) {
      const evidencias = provider.simulate(`CNPJ-ERRO-${i}`);
      if (evidencias.CENPROT.status === "ERRO_CONSULTA") {
        expect(evidencias.CENPROT.confidenceScore).toBeNull();
        expect(evidencias.CENPROT.motivoErro).not.toBeNull();
        return;
      }
    }
    throw new Error(
      "Nenhuma simulação de ERRO_CONSULTA ocorreu em 500 tentativas — revisar probabilidade",
    );
  });
});
