import { z } from "zod";

export const resolveIdentityRequestSchema = z.object({
  documento: z.string().min(1).max(20),
  nome: z.string().trim().min(1).max(200).nullable().optional(),
});

export type ResolveIdentityRequestBody = z.infer<typeof resolveIdentityRequestSchema>;
