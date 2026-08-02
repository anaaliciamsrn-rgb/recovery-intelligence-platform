import { z } from "zod";

export const createTenantRequestSchema = z.object({
  nome: z.string().min(1),
  slug: z.string().min(1),
});

export const registerTenantResourceRequestSchema = z.object({
  resourceType: z.string().min(1),
  resourceId: z.string().min(1),
});
