import type { Request, Response } from "express";
import { parseRequestBody } from "../../../../presentation/http/validation.js";
import type { Tenant } from "../../domain/entities/Tenant.js";
import type { CheckTenantAccessUseCase } from "../../application/use-cases/CheckTenantAccessUseCase.js";
import type { CreateTenantUseCase } from "../../application/use-cases/CreateTenantUseCase.js";
import type { GetTenantUseCase } from "../../application/use-cases/GetTenantUseCase.js";
import type { ListTenantsUseCase } from "../../application/use-cases/ListTenantsUseCase.js";
import type { RegisterTenantResourceUseCase } from "../../application/use-cases/RegisterTenantResourceUseCase.js";
import {
  createTenantRequestSchema,
  registerTenantResourceRequestSchema,
} from "../validators/tenant.validators.js";

export class TenantController {
  constructor(
    private readonly createTenantUseCase: CreateTenantUseCase,
    private readonly listTenantsUseCase: ListTenantsUseCase,
    private readonly getTenantUseCase: GetTenantUseCase,
    private readonly registerTenantResourceUseCase: RegisterTenantResourceUseCase,
    private readonly checkTenantAccessUseCase: CheckTenantAccessUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(createTenantRequestSchema, req.body);
    const tenant = await this.createTenantUseCase.execute(body);
    res.status(201).json(toTenantResponse(tenant));
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const tenants = await this.listTenantsUseCase.execute();
    res.status(200).json({ items: tenants.map(toTenantResponse) });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const tenant = await this.getTenantUseCase.execute(req.params.id ?? "");
    res.status(200).json(toTenantResponse(tenant));
  };

  registerResource = async (req: Request, res: Response): Promise<void> => {
    const body = parseRequestBody(registerTenantResourceRequestSchema, req.body);
    const ownership = await this.registerTenantResourceUseCase.execute({
      tenantId: req.params.id ?? "",
      resourceType: body.resourceType,
      resourceId: body.resourceId,
    });
    res
      .status(201)
      .json({
        id: ownership.id,
        tenantId: ownership.tenantId,
        resourceType: ownership.resourceType,
        resourceId: ownership.resourceId,
        createdAt: ownership.createdAt.toISOString(),
      });
  };

  checkAccess = async (req: Request, res: Response): Promise<void> => {
    const podeAcessar = await this.checkTenantAccessUseCase.execute({
      tenantId: req.params.id ?? "",
      resourceType: req.params.resourceType ?? "",
      resourceId: req.params.resourceId ?? "",
    });
    res.status(200).json({ podeAcessar });
  };
}

function toTenantResponse(tenant: Tenant) {
  return {
    id: tenant.id,
    nome: tenant.nome,
    slug: tenant.slug,
    ativo: tenant.ativo,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}
