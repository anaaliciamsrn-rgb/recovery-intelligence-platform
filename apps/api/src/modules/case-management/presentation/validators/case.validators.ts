import { z } from "zod";

const statusSchema = z.enum([
  "ABERTO",
  "EM_ANDAMENTO",
  "AGUARDANDO_RETORNO",
  "NEGOCIACAO",
  "RESOLVIDO",
  "CANCELADO",
]);
const prioritySchema = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]);

export const createCaseRequestSchema = z.object({
  dossieId: z.string().min(1),
  ownerId: z.string().min(1).optional(),
  priority: prioritySchema.optional(),
});

export const updateCaseStatusRequestSchema = z.object({
  status: statusSchema,
});

export const updateCaseDetailsRequestSchema = z.object({
  ownerId: z.string().min(1).nullable().optional(),
  priority: prioritySchema.optional(),
  tags: z.array(z.string()).optional(),
  proximaAcao: z.string().nullable().optional(),
  dataProximaAcao: z.coerce.date().nullable().optional(),
});

export const addCaseNoteRequestSchema = z.object({
  texto: z.string().min(1),
});

export const listCasesQuerySchema = z.object({
  status: statusSchema.optional(),
  ownerId: z.string().min(1).optional(),
  priority: prioritySchema.optional(),
  dossieId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
