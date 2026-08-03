import * as XLSX from "xlsx";
import { XlsxEmpresasParser } from "../../../src/modules/import/infrastructure/XlsxEmpresasParser.js";

function buildWorkbookBuffer(rows: Array<Array<string | number | undefined>>): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Empresas");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const HEADER = [
  "CNPJ",
  "Razão Social",
  "Nome Fantasia",
  "Telefone",
  "Email",
  "Cidade",
  "UF",
  "Responsável",
];

describe("XlsxEmpresasParser", () => {
  it("localiza colunas pelo nome do cabeçalho e lê as linhas de dados", () => {
    const buffer = buildWorkbookBuffer([
      HEADER,
      [
        "11.222.333/0001-81",
        "Empresa Um LTDA",
        "Empresa Um",
        "(11) 4000-0000",
        "contato@empresaum.com.br",
        "São Paulo",
        "SP",
        "Fulano de Tal",
      ],
    ]);

    const resultado = new XlsxEmpresasParser().parse(buffer);

    expect(resultado.rows).toHaveLength(1);
    expect(resultado.rows[0]).toEqual({
      numeroLinha: 2,
      cnpj: "11.222.333/0001-81",
      razaoSocial: "Empresa Um LTDA",
      nomeFantasia: "Empresa Um",
      telefone: "(11) 4000-0000",
      email: "contato@empresaum.com.br",
      cidade: "São Paulo",
      uf: "SP",
      responsavel: "Fulano de Tal",
    });
  });

  it("tolera colunas fora de ordem, localizando por nome normalizado", () => {
    const buffer = buildWorkbookBuffer([
      ["Razão Social", "CNPJ", "UF", "Cidade"],
      ["Empresa Invertida LTDA", "11.222.333/0001-81", "RJ", "Rio de Janeiro"],
    ]);

    const resultado = new XlsxEmpresasParser().parse(buffer);

    expect(resultado.rows[0]?.razaoSocial).toBe("Empresa Invertida LTDA");
    expect(resultado.rows[0]?.cnpj).toBe("11.222.333/0001-81");
    expect(resultado.rows[0]?.uf).toBe("RJ");
    expect(resultado.rows[0]?.cidade).toBe("Rio de Janeiro");
  });

  it("preserva linhas totalmente vazias na saída (não descarta em silêncio)", () => {
    const buffer = buildWorkbookBuffer([HEADER, [], ["11.222.333/0001-81", "Empresa LTDA"]]);

    const resultado = new XlsxEmpresasParser().parse(buffer);

    expect(resultado.rows).toHaveLength(2);
    expect(resultado.rows[0]?.cnpj).toBeNull();
    expect(resultado.rows[0]?.razaoSocial).toBeNull();
  });

  it("devolve lista vazia para uma planilha sem nenhuma linha", () => {
    const buffer = buildWorkbookBuffer([]);

    const resultado = new XlsxEmpresasParser().parse(buffer);

    expect(resultado.rows).toEqual([]);
  });
});
