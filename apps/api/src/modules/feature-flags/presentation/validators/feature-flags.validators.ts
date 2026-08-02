import { z } from "zod";

const escopoTipoSchema = z.enum(["TENANT", "AMBIENTE", "USUARIO"]);

export const createFeatureFlagRequestSchema = z.object({
  chave: z.string().min(1),
  descricao: z.string().nullable().optional(),
  ativoPadrao: z.boolean().optional(),
});

export const updateFeatureFlagRequestSchema = z.object({
  descricao: z.string().nullable().optional(),
  ativoPadrao: z.boolean(),
});

export const setFeatureFlagOverrideRequestSchema = z.object({
  escopoTipo: escopoTipoSchema,
  escopoValor: z.string().min(1),
  ativo: z.boolean(),
});

export const listFeatureFlagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const evaluateFeatureFlagQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  ambiente: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});
