import * as XLSX from "xlsx";
import {
  generateEmpresasDemoWorkbook,
  generateEmpresasTemplateWorkbook,
} from "../../../src/modules/import/infrastructure/EmpresaSpreadsheetTemplateGenerator.js";
import { XlsxEmpresasParser } from "../../../src/modules/import/infrastructure/XlsxEmpresasParser.js";
import { CNPJ } from "../../../src/modules/party/domain/value-objects/CNPJ.js";

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

describe("EmpresaSpreadsheetTemplateGenerator", () => {
  it("gera um modelo com cabeçalho correto e uma linha de exemplo com CNPJ válido", () => {
    const buffer = generateEmpresasTemplateWorkbook();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet as XLSX.WorkSheet, { header: 1 });

    expect(rows[0]).toEqual(HEADER);
    expect(rows).toHaveLength(2);

    const parsed = new XlsxEmpresasParser().parse(buffer);
    expect(parsed.rows).toHaveLength(1);
    const cnpj = parsed.rows[0]?.cnpj;
    expect(cnpj).not.toBeNull();
    expect(() => CNPJ.create(cnpj as string)).not.toThrow();
  });

  it("gera a planilha demo com 50 empresas fictícias, todas com CNPJ válido e sem duplicatas", () => {
    const buffer = generateEmpresasDemoWorkbook();
    const parsed = new XlsxEmpresasParser().parse(buffer);

    expect(parsed.rows).toHaveLength(50);

    const cnpjsVistos = new Set<string>();
    for (const row of parsed.rows) {
      expect(row.cnpj).not.toBeNull();
      expect(row.razaoSocial).not.toBeNull();
      expect(row.uf).not.toBeNull();

      const cnpj = CNPJ.create(row.cnpj as string).toString();
      expect(cnpjsVistos.has(cnpj)).toBe(false);
      cnpjsVistos.add(cnpj);
    }
  });

  it("a demo cobre mais de um estado (carteira geograficamente variada)", () => {
    const buffer = generateEmpresasDemoWorkbook();
    const parsed = new XlsxEmpresasParser().parse(buffer);

    const estados = new Set(parsed.rows.map((row) => row.uf));
    expect(estados.size).toBeGreaterThan(5);
  });
});
