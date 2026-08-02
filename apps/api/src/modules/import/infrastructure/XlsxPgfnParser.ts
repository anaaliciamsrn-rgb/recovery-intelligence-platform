import * as XLSX from "xlsx";
import type {
  IImportSourceParser,
  ParsedImportBatch,
  ParsedImportRow,
} from "../application/ports/IImportSourceParser.js";

const FONTE_PGFN = "PGFN_LISTA_DEVEDORES";
const CABECALHO_ESPERADO = "CPF/CNPJ";
const NATUREZA_DIVIDA_PREFIXO = /^Natureza da d[íi]vida:\s*(.+)$/i;

type SheetRow = Array<string | number | undefined>;

function toCellString(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

/**
 * Parser específico do export "Lista de Devedores" da PGFN (colunas fixas:
 * CPF/CNPJ, Nome, Nome Fantasia, Valor Total, Valor da Dívida Selecionada —
 * ver ADR 0019). Não assume número fixo de linhas de metadados no topo:
 * localiza o cabeçalho real procurando a linha cuja primeira célula é
 * literalmente "CPF/CNPJ", e lê "Natureza da dívida" do bloco de filtros
 * acima dele. Um formato de export diferente da PGFN exigiria atualizar só
 * este arquivo — nenhuma mudança no use case que o consome.
 */
export class XlsxPgfnParser implements IImportSourceParser {
  parse(fileBuffer: Buffer): ParsedImportBatch {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { fonte: FONTE_PGFN, rows: [] };
    }

    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      return { fonte: FONTE_PGFN, rows: [] };
    }
    const rows: SheetRow[] = XLSX.utils.sheet_to_json<SheetRow>(sheet, {
      header: 1,
      raw: true,
      defval: undefined,
    });

    const headerIndex = rows.findIndex((row) => toCellString(row[0]) === CABECALHO_ESPERADO);
    if (headerIndex === -1) {
      return { fonte: FONTE_PGFN, rows: [] };
    }

    const naturezaDivida = this.extrairNaturezaDivida(rows.slice(0, headerIndex));

    const parsedRows: ParsedImportRow[] = rows.slice(headerIndex + 1).map((row, offset) => ({
      numeroLinha: headerIndex + 1 + offset + 1,
      documento: toCellString(row[0]),
      nome: toCellString(row[1]),
      nomeFantasia: toCellString(row[2]),
      valorTotal: toCellString(row[3]),
      valorDividaSelecionada: toCellString(row[4]),
      naturezaDivida,
    }));

    return { fonte: FONTE_PGFN, rows: parsedRows };
  }

  private extrairNaturezaDivida(metadataRows: SheetRow[]): string | null {
    for (const row of metadataRows) {
      const primeiraCelula = toCellString(row[0]);
      if (!primeiraCelula) continue;
      const match = NATUREZA_DIVIDA_PREFIXO.exec(primeiraCelula);
      if (match) return match[1]?.trim() ?? null;
    }
    return null;
  }
}
