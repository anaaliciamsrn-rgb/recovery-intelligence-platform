import { z } from "zod";

/**
 * Validação aqui é só guarda de forma (tipo/tamanho) — a validação de
 * negócio (dígito verificador do CNPJ) é responsabilidade do domínio
 * (`CNPJ`), não duplicada aqui. Mesmo padrão de auth.validators.ts.
 */
export const registerEmpresaRequestSchema = z.object({
  cnpj: z.string().min(1).max(20),
  razaoSocial: z.string().trim().min(1).max(200),
});

export type RegisterEmpresaRequestBody = z.infer<typeof registerEmpresaRequestSchema>;
