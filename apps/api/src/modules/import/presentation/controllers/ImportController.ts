import type { Request, Response } from "express";
import { AppError } from "../../../../application/errors/AppError.js";
import type { ImportBatch } from "../../domain/entities/ImportBatch.js";
import type { GetImportDashboardUseCase } from "../../application/use-cases/GetImportDashboardUseCase.js";
import type { GetImportReportUseCase } from "../../application/use-cases/GetImportReportUseCase.js";
import type { ImportPgfnSpreadsheetUseCase } from "../../application/use-cases/ImportPgfnSpreadsheetUseCase.js";
import type { ListImportBatchesUseCase } from "../../application/use-cases/ListImportBatchesUseCase.js";
import type { PreviewImportSpreadsheetUseCase } from "../../application/use-cases/PreviewImportSpreadsheetUseCase.js";
import type { ResolveImportRowIdentityUseCase } from "../../application/use-cases/ResolveImportRowIdentityUseCase.js";
import type { RollbackImportBatchUseCase } from "../../application/use-cases/RollbackImportBatchUseCase.js";
import type { RegisterTenantResourceUseCase } from "../../../tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import {
  listImportBatchesQuerySchema,
  rollbackImportBatchRequestSchema,
} from "../validators/import.validators.js";

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
}

export class ImportController {
  constructor(
    private readonly importPgfnSpreadsheetUseCase: ImportPgfnSpreadsheetUseCase,
    private readonly resolveImportRowIdentityUseCase: ResolveImportRowIdentityUseCase,
    private readonly getImportDashboardUseCase: GetImportDashboardUseCase,
    private readonly getImportReportUseCase: GetImportReportUseCase,
    private readonly previewImportSpreadsheetUseCase: PreviewImportSpreadsheetUseCase,
    private readonly rollbackImportBatchUseCase: RollbackImportBatchUseCase,
    private readonly listImportBatchesUseCase: ListImportBatchesUseCase,
    private readonly registerTenantResourceUseCase: RegisterTenantResourceUseCase,
  ) {}

  importar = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const file = (req as Request & { file?: UploadedFile }).file;
    if (!file) {
      throw new AppError("VALIDATION", "Arquivo não enviado (campo 'file' obrigatório)");
    }

    const resultadoImportacao = await this.importPgfnSpreadsheetUseCase.execute({
      fileBuffer: file.buffer,
      nomeArquivo: file.originalname,
      iniciadoPorUsuarioId: req.auth.userId,
    });

    await this.registerTenantResourceUseCase.execute({
      tenantId: req.auth.tenantId,
      resourceType: "ImportBatch",
      resourceId: resultadoImportacao.importBatchId,
    });

    const resultadoResolucao = await this.resolveImportRowIdentityUseCase.execute(
      resultadoImportacao.importBatchId,
    );

    res.status(201).json({
      importBatchId: resultadoImportacao.importBatchId,
      totalLinhas: resultadoImportacao.totalLinhas,
      contagens: resultadoImportacao.contagens,
      resolucaoDeIdentidade: resultadoResolucao,
    });
  };

  dashboard = async (req: Request, res: Response): Promise<void> => {
    const dashboard = await this.getImportDashboardUseCase.execute(req.params.id ?? "");
    res.status(200).json(dashboard);
  };

  relatorio = async (req: Request, res: Response): Promise<void> => {
    const relatorio = await this.getImportReportUseCase.execute(req.params.id ?? "");
    res.status(200).json(relatorio);
  };

  preview = async (req: Request, res: Response): Promise<void> => {
    const file = (req as Request & { file?: UploadedFile }).file;
    if (!file) {
      throw new AppError("VALIDATION", "Arquivo não enviado (campo 'file' obrigatório)");
    }

    const resultado = await this.previewImportSpreadsheetUseCase.execute({
      fileBuffer: file.buffer,
    });
    res.status(200).json(resultado);
  };

  rollback = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(rollbackImportBatchRequestSchema, req.body);
    const batch = await this.rollbackImportBatchUseCase.execute({
      importBatchId: req.params.id ?? "",
      motivo: body.motivo,
    });
    res.status(200).json(toBatchSummary(batch));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new AppError("UNAUTHORIZED", "Não autenticado");
    }

    const query = parseRequestBody(listImportBatchesQuerySchema, req.query);
    const pagina = await this.listImportBatchesUseCase.execute(req.auth.tenantId, {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 50,
    });
    res.status(200).json({
      items: pagina.items.map(toBatchSummary),
      total: pagina.total,
      page: pagina.page,
      pageSize: pagina.pageSize,
    });
  };
}

function toBatchSummary(batch: ImportBatch) {
  return {
    id: batch.id,
    fonte: batch.fonte,
    nomeArquivo: batch.nomeArquivo,
    iniciadoEm: batch.iniciadoEm.toISOString(),
    finalizadoEm: batch.finalizadoEm ? batch.finalizadoEm.toISOString() : null,
    totalLinhas: batch.totalLinhas,
    contagens: batch.contagens,
    status: batch.status,
    revertidoEm: batch.revertidoEm ? batch.revertidoEm.toISOString() : null,
    motivoReversao: batch.motivoReversao,
    iniciadoPorUsuarioId: batch.iniciadoPorUsuarioId,
  };
}
