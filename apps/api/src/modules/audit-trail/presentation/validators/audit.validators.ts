import { z } from "zod";

const auditEventTypeSchema = z.enum([
  "LOGIN",
  "LOGOUT",
  "PESSOA_CRIADA",
  "EMPRESA_CRIADA",
  "PARTICIPACAO_SOCIETARIA_CRIADA",
  "PLANILHA_IMPORTADA",
  "DOSSIE_CRIADO",
  "EVIDENCIA_ATUALIZADA",
  "IDENTITY_RESOLUTION_EXECUTADA",
  "CLASSIFICACAO_EXECUTADA",
  "RECOMENDACAO_GERADA",
  "PROMPT_GERADO",
  "EXPLICACAO_CONSULTADA",
]);

/**
 * Sem `.default()`/`.transform()` de propósito: `parseRequestBody` (shared
 * kernel) exige `ZodSchema<T>` com Input = Output, o que `.default()` e
 * `.transform()` quebram (o valor "antes" difere do "depois"). Os valores
 * default de paginação e a conversão de `sucesso` para booleano ficam a
 * cargo do controller — nenhuma mudança no helper compartilhado.
 */
const paginationSchemaShape = {
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["timestamp", "duracaoMs"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
};

export const listAuditEventsQuerySchema = z.object({
  desde: z.coerce.date().optional(),
  ate: z.coerce.date().optional(),
  usuarioId: z.string().min(1).optional(),
  tipo: auditEventTypeSchema.optional(),
  entidade: z.string().min(1).optional(),
  sucesso: z.enum(["true", "false"]).optional(),
  ...paginationSchemaShape,
});

export const paginationQuerySchema = z.object(paginationSchemaShape);

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
