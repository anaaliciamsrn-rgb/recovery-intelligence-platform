export interface ParsedImportRow {
  numeroLinha: number;
  documento: string | null;
  nome: string | null;
  nomeFantasia: string | null;
  valorTotal: string | null;
  valorDividaSelecionada: string | null;
  naturezaDivida: string | null;
}

export interface ParsedImportBatch {
  fonte: string;
  rows: ParsedImportRow[];
}

/**
 * Contrato do parser de um formato de arquivo de origem — a única peça que
 * conhece a estrutura real do arquivo (linhas de metadados, cabeçalho,
 * onde os dados começam). Devolve valores **ainda crus** (`valorTotal`
 * como string, não number) de propósito: parsing de formato numérico e
 * validação de negócio são responsabilidade da camada de aplicação
 * (`ImportPgfnSpreadsheetUseCase`), não do parser. Um novo formato de
 * origem é uma nova implementação deste contrato — nenhuma mudança no use
 * case. Ver ADR 0019.
 */
export interface IImportSourceParser {
  parse(fileBuffer: Buffer): ParsedImportBatch;
}
