export interface ParsedEmpresaRow {
  numeroLinha: number;
  cnpj: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  responsavel: string | null;
}

export interface ParsedEmpresaBatch {
  rows: ParsedEmpresaRow[];
}

/**
 * Contrato do parser da planilha "Importar Empresas" (CNPJ | Razão Social |
 * Nome Fantasia | Telefone | Email | Cidade | UF | Responsável) — mesmo
 * espírito de `IImportSourceParser` (ADR 0019): devolve valores ainda crus,
 * validação de negócio é responsabilidade do use case, nunca do parser.
 */
export interface IEmpresaSpreadsheetParser {
  parse(fileBuffer: Buffer): ParsedEmpresaBatch;
}
