import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { GenerateEmpresasDemoUseCase } from "../../application/use-cases/GenerateEmpresasDemoUseCase.js";
import type { GenerateEmpresasTemplateUseCase } from "../../application/use-cases/GenerateEmpresasTemplateUseCase.js";
import type { ImportEmpresasSpreadsheetUseCase } from "../../application/use-cases/ImportEmpresasSpreadsheetUseCase.js";
import type { ResetTenantImportedDataUseCase } from "../../application/use-cases/ResetTenantImportedDataUseCase.js";

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Endpoints do fluxo "Importar Empresas" (ver ADR 0037) — separado de `ImportController` (fluxo PGFN) por serem pipelines de negócio distintos, mesmo módulo. */
export class ImportEmpresasController {
  constructor(
    private readonly importEmpresasSpreadsheetUseCase: ImportEmpresasSpreadsheetUseCase,
    private readonly generateEmpresasTemplateUseCase: GenerateEmpresasTemplateUseCase,
    private readonly generateEmpresasDemoUseCase: GenerateEmpresasDemoUseCase,
    private readonly resetTenantImportedDataUseCase: ResetTenantImportedDataUseCase,
  ) {}

  importar = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const file = (req as Request & { file?: UploadedFile }).file;
    if (!file) {
      throw new AppError("VALIDATION", "Arquivo não enviado (campo 'file' obrigatório)");
    }

    const resultado = await this.importEmpresasSpreadsheetUseCase.execute({
      fileBuffer: file.buffer,
      nomeArquivo: file.originalname,
      tenantId: req.auth.tenantId,
      iniciadoPorUsuarioId: req.auth.userId,
    });

    res.status(201).json(resultado);
  };

  modelo = (_req: Request, res: Response): void => {
    const buffer = this.generateEmpresasTemplateUseCase.execute();
    res.setHeader("Content-Type", XLSX_CONTENT_TYPE);
    res.setHeader("Content-Disposition", 'attachment; filename="modelo_empresas.xlsx"');
    res.status(200).send(buffer);
  };

  demo = (_req: Request, res: Response): void => {
    const buffer = this.generateEmpresasDemoUseCase.execute();
    res.setHeader("Content-Type", XLSX_CONTENT_TYPE);
    res.setHeader("Content-Disposition", 'attachment; filename="demo_empresas.xlsx"');
    res.status(200).send(buffer);
  };

  /** "Limpar dados importados" — desfaz só as importações do próprio tenant (ver ADR 0037), nunca afeta outro tenant. */
  resetar = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const resultado = await this.resetTenantImportedDataUseCase.execute(req.auth.tenantId);
    res.status(200).json(resultado);
  };
}
