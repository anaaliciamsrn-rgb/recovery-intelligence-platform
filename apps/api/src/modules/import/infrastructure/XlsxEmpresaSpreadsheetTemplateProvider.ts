import type { IEmpresaSpreadsheetTemplateProvider } from "../application/ports/IEmpresaSpreadsheetTemplateProvider.js";
import {
  generateEmpresasDemoWorkbook,
  generateEmpresasTemplateWorkbook,
} from "./EmpresaSpreadsheetTemplateGenerator.js";

export class XlsxEmpresaSpreadsheetTemplateProvider implements IEmpresaSpreadsheetTemplateProvider {
  generateTemplate(): Buffer {
    return generateEmpresasTemplateWorkbook();
  }

  generateDemo(): Buffer {
    return generateEmpresasDemoWorkbook();
  }
}
