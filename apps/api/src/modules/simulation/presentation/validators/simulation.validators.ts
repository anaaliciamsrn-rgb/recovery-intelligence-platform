import { z } from "zod";

/**
 * Validação aqui é só guarda de forma — a obrigatoriedade de "status" só
 * quando "acao" é "SUBSTITUIR" é invariante de negócio, verificada por
 * `SimulationChangeApplier` (domínio), não duplicada aqui. Mesmo espírito
 * de `registerParticipacaoSocietariaRequestSchema` (party).
 */
const evidenciaChangeSchema = z.object({
  tipo: z.literal("EVIDENCIA"),
  fonte: z.enum(["PGFN", "DATAJUD", "RECEITA_FEDERAL", "PORTAL_TRANSPARENCIA", "CENPROT"]),
  acao: z.enum(["SUBSTITUIR", "REMOVER"]),
  status: z.enum(["ENCONTRADO", "NAO_ENCONTRADO", "ERRO_CONSULTA"]).optional(),
  valor: z.unknown().optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  motivoErro: z.string().optional(),
});

const confiancaOverrideChangeSchema = z.object({
  tipo: z.literal("CONFIANCA_OVERRIDE"),
  valor: z.number().min(0).max(1),
});

const classificacaoOverrideChangeSchema = z.object({
  tipo: z.literal("CLASSIFICACAO_OVERRIDE"),
  valor: z.enum(["BAIXO_RISCO", "MEDIO_RISCO", "ALTO_RISCO"]),
});

const simulationChangeSchema = z.discriminatedUnion("tipo", [
  evidenciaChangeSchema,
  confiancaOverrideChangeSchema,
  classificacaoOverrideChangeSchema,
]);

export const runSimulationRequestSchema = z.object({
  dossieId: z.string().min(1),
  changes: z.array(simulationChangeSchema),
});
