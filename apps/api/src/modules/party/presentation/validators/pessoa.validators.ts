import { z } from "zod";

/**
 * Validação aqui é só guarda de forma (tipo/tamanho) — a validação de
 * negócio (dígito verificador do CPF) é responsabilidade do domínio (`CPF`),
 * não duplicada aqui. Mesmo padrão de auth.validators.ts.
 */
export const registerPessoaRequestSchema = z.object({
  cpf: z.string().min(1).max(20),
  nome: z.string().trim().min(1).max(200),
});

export type RegisterPessoaRequestBody = z.infer<typeof registerPessoaRequestSchema>;
