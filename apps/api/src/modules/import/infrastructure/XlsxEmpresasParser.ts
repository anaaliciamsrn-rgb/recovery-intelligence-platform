import * as XLSX from "xlsx";
import type {
  IEmpresaSpreadsheetParser,
  ParsedEmpresaBatch,
  ParsedEmpresaRow,
} from "../application/ports/IEmpresaSpreadsheetParser.js";

type SheetRow = Array<string | number | undefined>;
type EmpresaField = Exclude<keyof ParsedEmpresaRow, "numeroLinha">;

/**
 * Aliases normalizados (sem acento, maiúsculo) de cabeçalho aceitos por
 * coluna — localizado por nome, não por posição fixa, para tolerar reordenar
 * colunas na planilha do usuário (diferente de `XlsxPgfnParser`, cujo layout
 * é sempre o export fixo da PGFN).
 */
const COLUMN_ALIASES: Record<string, EmpresaField> = {
  CNPJ: "cnpj",
  "RAZAO SOCIAL": "razaoSocial",
  "NOME FANTASIA": "nomeFantasia",
  TELEFONE: "telefone",
  EMAIL: "email",
  "E-MAIL": "email",
  CIDADE: "cidade",
  UF: "uf",
  RESPONSAVEL: "responsavel",
};

function normalizeHeader(value: string | number | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase();
}

function toCellString(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

/**
 * Parser da planilha "Importar Empresas" (ver ADR 0037) — colunas: CNPJ |
 * Razão Social | Nome Fantasia | Telefone | Email | Cidade | UF |
 * Responsável, na primeira linha da primeira aba. Linhas totalmente vazias
 * são preservadas na saída (nunca descartadas em silêncio) — é o use case
 * chamador que decide marcá-las `IGNORADA`, mesmo padrão de
 * `ImportPgfnSpreadsheetUseCase`.
 */
export class XlsxEmpresasParser implements IEmpresaSpreadsheetParser {
  parse(fileBuffer: Buffer): ParsedEmpresaBatch {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return { rows: [] };

    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) return { rows: [] };

    const rows: SheetRow[] = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
      header: 1,
      raw: true,
      defval: undefined,
    });
    if (rows.length === 0) return { rows: [] };

    const headerRow = rows[0] ?? [];
    const columnIndexByField = new Map<EmpresaField, number>();
    headerRow.forEach((cell, index) => {
      const field = COLUMN_ALIASES[normalizeHeader(cell)];
      if (field) columnIndexByField.set(field, index);
    });

    const cellAt = (row: SheetRow, field: EmpresaField): string | null => {
      const index = columnIndexByField.get(field);
      if (index === undefined) return null;
      return toCellString(row[index]);
    };

    const parsedRows: ParsedEmpresaRow[] = rows.slice(1).map((row, offset) => ({
      numeroLinha: offset + 2,
      cnpj: cellAt(row, "cnpj"),
      razaoSocial: cellAt(row, "razaoSocial"),
      nomeFantasia: cellAt(row, "nomeFantasia"),
      telefone: cellAt(row, "telefone"),
      email: cellAt(row, "email"),
      cidade: cellAt(row, "cidade"),
      uf: cellAt(row, "uf"),
      responsavel: cellAt(row, "responsavel"),
    }));

    return { rows: parsedRows };
  }
}
