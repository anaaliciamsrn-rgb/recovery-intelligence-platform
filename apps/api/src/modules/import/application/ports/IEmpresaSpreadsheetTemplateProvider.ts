/**
 * Porta para a geração dos arquivos .xlsx de apoio ao fluxo "Importar
 * Empresas" (modelo em branco + planilha demo com dados fictícios, ver ADR
 * 0037) — a implementação real usa a biblioteca `xlsx` (infrastructure);
 * `presentation` nunca a importa diretamente (ver ADR 0035, mesmo padrão de
 * `IMetricsProvider`).
 */
export interface IEmpresaSpreadsheetTemplateProvider {
  generateTemplate(): Buffer;
  generateDemo(): Buffer;
}
