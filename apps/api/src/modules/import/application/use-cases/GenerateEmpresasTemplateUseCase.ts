import type { IEmpresaSpreadsheetTemplateProvider } from "../ports/IEmpresaSpreadsheetTemplateProvider.js";

/** "Baixar modelo" no fluxo Importar Empresas (ADR 0037). */
export class GenerateEmpresasTemplateUseCase {
  constructor(private readonly templateProvider: IEmpresaSpreadsheetTemplateProvider) {}

  execute(): Buffer {
    return this.templateProvider.generateTemplate();
  }
}
