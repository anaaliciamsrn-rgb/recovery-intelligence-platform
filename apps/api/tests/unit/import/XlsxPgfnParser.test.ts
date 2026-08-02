import * as XLSX from "xlsx";
import { XlsxPgfnParser } from "../../../src/modules/import/infrastructure/XlsxPgfnParser.js";

function buildWorkbookBuffer(rows: Array<Array<string | number | undefined>>): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Lista de Devedores");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

const HEADER = ["CPF/CNPJ", "Nome", "Nome Fantasia", "Valor Total", "Valor da Dívida Selecionada"];

describe("XlsxPgfnParser", () => {
  it("extrai a natureza da dívida do bloco de metadados e lê as linhas de dados", () => {
    const buffer = buildWorkbookBuffer([
      ["Lista de Devedores"],
      ["Natureza da dívida: Imposto de Renda"],
      [],
      HEADER,
      ["***.111.222-**", "FULANO DE TAL", undefined, "1000.50", "800.25"],
      ["***.333.444-**", "CICLANA DA SILVA", "NOME FANTASIA LTDA", "2500", "2500"],
    ]);

    const resultado = new XlsxPgfnParser().parse(buffer);

    expect(resultado.fonte).toBe("PGFN_LISTA_DEVEDORES");
    expect(resultado.rows).toHaveLength(2);
    expect(resultado.rows[0]).toEqual({
      numeroLinha: 5,
      documento: "***.111.222-**",
      nome: "FULANO DE TAL",
      nomeFantasia: null,
      valorTotal: "1000.50",
      valorDividaSelecionada: "800.25",
      naturezaDivida: "Imposto de Renda",
    });
    expect(resultado.rows[1]?.naturezaDivida).toBe("Imposto de Renda");
    expect(resultado.rows[1]?.nomeFantasia).toBe("NOME FANTASIA LTDA");
  });

  it("devolve lista vazia quando não encontra a linha de cabeçalho esperada", () => {
    const buffer = buildWorkbookBuffer([
      ["Isto não é um export da PGFN"],
      ["Coluna A", "Coluna B"],
      ["valor1", "valor2"],
    ]);

    const resultado = new XlsxPgfnParser().parse(buffer);

    expect(resultado.rows).toEqual([]);
  });

  it("devolve naturezaDivida nula quando o bloco de metadados não contém a linha esperada", () => {
    const buffer = buildWorkbookBuffer([
      ["Lista de Devedores"],
      HEADER,
      ["***.555.666-**", "FULANO DE TAL", undefined, "100", "100"],
    ]);

    const resultado = new XlsxPgfnParser().parse(buffer);

    expect(resultado.rows[0]?.naturezaDivida).toBeNull();
  });

  it("devolve lista vazia quando a aba não contém a linha de cabeçalho", () => {
    const buffer = buildWorkbookBuffer([[]]);

    const resultado = new XlsxPgfnParser().parse(buffer);

    expect(resultado.rows).toEqual([]);
  });
});
