import type { IEmpresaSpreadsheetTemplateProvider } from "../ports/IEmpresaSpreadsheetTemplateProvider.js";

/** "Baixar planilha demo" no fluxo Importar Empresas (ADR 0037). */
export class GenerateEmpresasDemoUseCase {
  constructor(private readonly templateProvider: IEmpresaSpreadsheetTemplateProvider) {}

  execute(): Buffer {
    return this.templateProvider.generateDemo();
  }
}
