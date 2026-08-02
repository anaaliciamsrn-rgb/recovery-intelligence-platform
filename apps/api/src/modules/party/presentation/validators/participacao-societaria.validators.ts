import { z } from "zod";

/**
 * Validação aqui é só guarda de forma — invariantes de negócio (percentual
 * 0-100, datas coerentes) são responsabilidade do domínio
 * (`ParticipacaoSocietaria`), não duplicadas aqui.
 */
export const registerParticipacaoSocietariaRequestSchema = z.object({
  pessoaId: z.string().min(1),
  empresaId: z.string().min(1),
  papel: z.enum(["SOCIO", "ADMINISTRADOR", "SOCIO_ADMINISTRADOR"]),
  percentualParticipacao: z.number().nullable().optional(),
  dataEntrada: z.coerce.date().nullable().optional(),
});

export type RegisterParticipacaoSocietariaRequestBody = z.infer<
  typeof registerParticipacaoSocietariaRequestSchema
>;

export const encerrarParticipacaoSocietariaRequestSchema = z.object({
  dataSaida: z.coerce.date().nullable().optional(),
});

export type EncerrarParticipacaoSocietariaRequestBody = z.infer<
  typeof encerrarParticipacaoSocietariaRequestSchema
>;

export const listParticipacoesQuerySchema = z
  .object({
    pessoaId: z.string().min(1).optional(),
    empresaId: z.string().min(1).optional(),
  })
  .refine((query) => Boolean(query.pessoaId) !== Boolean(query.empresaId), {
    message: "Informe exatamente um entre pessoaId e empresaId",
  });
