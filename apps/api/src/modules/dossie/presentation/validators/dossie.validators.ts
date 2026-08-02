import { z } from "zod";

export const createDossieRequestSchema = z.object({
  subjectType: z.enum(["PESSOA", "EMPRESA"]),
  subjectId: z.string().min(1),
});

export type CreateDossieRequestBody = z.infer<typeof createDossieRequestSchema>;

export const registrarEvidenciaRequestSchema = z.object({
  fonte: z.enum(["PGFN", "DATAJUD", "RECEITA_FEDERAL", "PORTAL_TRANSPARENCIA", "CENPROT"]),
  status: z.enum(["ENCONTRADO", "NAO_ENCONTRADO", "NAO_CONSULTADO", "ERRO_CONSULTA"]),
  valor: z.unknown().optional(),
  confidenceScore: z.number().nullable().optional(),
  motivoErro: z.string().min(1).nullable().optional(),
});

export type RegistrarEvidenciaRequestBody = z.infer<typeof registrarEvidenciaRequestSchema>;
