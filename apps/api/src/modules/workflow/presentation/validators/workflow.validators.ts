import { z } from "zod";

const workflowConditionSchema = z.object({
  campo: z.string().min(1),
  operador: z.enum(["IGUAL", "DIFERENTE", "MAIOR_QUE", "MENOR_QUE"]),
  valor: z.union([z.string(), z.number(), z.boolean()]),
});

const workflowTransitionInputSchema = z.object({
  de: z.string().min(1),
  para: z.string().min(1),
  gatilho: z.string().min(1),
  condicao: workflowConditionSchema.nullable().optional(),
  acao: z.string().nullable().optional(),
});

export const createWorkflowDefinitionRequestSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  estados: z.array(z.string().min(1)).min(1),
  estadoInicial: z.string().min(1),
  transicoes: z.array(workflowTransitionInputSchema),
});

export const startWorkflowInstanceRequestSchema = z.object({
  referenciaId: z.string().min(1),
});

export const triggerWorkflowTransitionRequestSchema = z.object({
  gatilho: z.string().min(1),
  contexto: z.record(z.unknown()).optional(),
});
