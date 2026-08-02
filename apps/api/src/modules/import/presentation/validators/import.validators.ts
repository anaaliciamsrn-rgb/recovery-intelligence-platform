import { z } from "zod";

export const rollbackImportBatchRequestSchema = z.object({
  motivo: z.string().min(1),
});

export const listImportBatchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});
