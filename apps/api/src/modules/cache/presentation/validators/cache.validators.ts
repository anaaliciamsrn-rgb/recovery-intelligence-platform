import { z } from "zod";

export const setCacheEntryRequestSchema = z.object({
  identifier: z.string().min(1).optional(),
  valor: z.unknown(),
  ttlSegundos: z.number().int().min(1).optional(),
});

export const cacheIdentifierQuerySchema = z.object({
  identifier: z.string().min(1).optional(),
});
