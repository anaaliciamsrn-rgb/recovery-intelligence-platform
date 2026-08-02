import { z } from "zod";

const ruleConditionSchema = z.object({
  campo: z.string().min(1),
  operador: z.enum(["IGUAL", "DIFERENTE", "MAIOR_QUE", "MENOR_QUE"]),
  valor: z.union([z.string(), z.number(), z.boolean()]),
});

export const createRuleDefinitionRequestSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  recurso: z.string().min(1),
  condicoes: z.array(ruleConditionSchema).min(1),
  peso: z.number().min(0),
  prioridade: z.number().int().min(0),
  acao: z.string().min(1),
  ativo: z.boolean().optional(),
});

export const updateRuleDefinitionRequestSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  condicoes: z.array(ruleConditionSchema).min(1),
  peso: z.number().min(0),
  prioridade: z.number().int().min(0),
  acao: z.string().min(1),
  ativo: z.boolean(),
});

export const listRuleDefinitionsQuerySchema = z.object({
  recurso: z.string().min(1).optional(),
  ativo: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const evaluateRulesRequestSchema = z.object({
  recurso: z.string().min(1),
  contexto: z.record(z.unknown()),
});
