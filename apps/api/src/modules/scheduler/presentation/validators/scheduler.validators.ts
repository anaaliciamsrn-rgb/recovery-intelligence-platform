import { z } from "zod";

export const createScheduledJobRequestSchema = z.object({
  nome: z.string().min(1),
  tipo: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
  agendadoPara: z.coerce.date(),
  maxTentativas: z.number().int().min(1).optional(),
});

export const listScheduledJobsQuerySchema = z.object({
  status: z.enum(["PENDENTE", "EXECUTANDO", "CONCLUIDO", "MORTO"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const runDueJobsRequestSchema = z.object({
  limit: z.number().int().min(1).max(500).optional(),
});
