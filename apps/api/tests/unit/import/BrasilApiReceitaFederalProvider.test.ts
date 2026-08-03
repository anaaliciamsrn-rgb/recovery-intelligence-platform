import { BrasilApiReceitaFederalProvider } from "../../../src/modules/import/infrastructure/BrasilApiReceitaFederalProvider.js";

describe("BrasilApiReceitaFederalProvider", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("devolve ENCONTRADO com os dados reais quando a BrasilAPI responde 200", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        descricao_situacao_cadastral: "ATIVA",
        razao_social: "Empresa Real LTDA",
        nome_fantasia: "Empresa Real",
        natureza_juridica: "Sociedade Empresária Limitada",
        capital_social: 100000,
        cnae_fiscal_descricao: "Comércio varejista",
        data_inicio_atividade: "2010-01-01",
        municipio: "SAO PAULO",
        uf: "SP",
      }),
    }) as unknown as typeof fetch;

    const provider = new BrasilApiReceitaFederalProvider();
    const resultado = await provider.consultar("19131243000197");

    expect(resultado.status).toBe("ENCONTRADO");
    expect(resultado.status === "ENCONTRADO" && resultado.valor.situacaoCadastral).toBe("ATIVA");
    expect(resultado.status === "ENCONTRADO" && resultado.valor.razaoSocial).toBe(
      "Empresa Real LTDA",
    );
  });

  it("devolve NAO_ENCONTRADO quando a BrasilAPI responde 404 (CNPJ fictício, ex.: planilha demo)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const provider = new BrasilApiReceitaFederalProvider();
    const resultado = await provider.consultar("10000274000134");

    expect(resultado.status).toBe("NAO_ENCONTRADO");
  });

  it("devolve ERRO_CONSULTA (nunca um falso negativo) quando a BrasilAPI responde 500", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    const provider = new BrasilApiReceitaFederalProvider();
    const resultado = await provider.consultar("19131243000197");

    expect(resultado.status).toBe("ERRO_CONSULTA");
  });

  it("devolve ERRO_CONSULTA quando a requisição falha por rede", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    const provider = new BrasilApiReceitaFederalProvider();
    const resultado = await provider.consultar("19131243000197");

    expect(resultado.status).toBe("ERRO_CONSULTA");
  });
});
