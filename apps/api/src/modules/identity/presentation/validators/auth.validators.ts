import { z } from "zod";

/**
 * Validação aqui é só guarda de forma (tipo/tamanho) — a validação de
 * negócio (formato de email, política de senha) é responsabilidade do
 * domínio (`Email`, `PlainPassword`), não duplicada aqui.
 */
export const loginRequestSchema = z.object({
  email: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
  /** Default `true` (mesmo comportamento de antes desta fase para chamadores que não enviam o campo). `false` = cookie de sessão (apagado ao fechar o navegador), não um cookie persistente. */
  rememberMe: z.boolean().default(true),
});

export type LoginRequestBody = z.infer<typeof loginRequestSchema>;

export const registerRequestSchema = z.object({
  email: z.string().min(1).max(255),
  password: z.string().min(1).max(128),
  nome: z.string().min(1).max(120),
  sobrenome: z.string().min(1).max(120),
  empresa: z.string().max(160).nullable().optional(),
  cargo: z.string().max(120).nullable().optional(),
});

export type RegisterRequestBody = z.infer<typeof registerRequestSchema>;

export const requestPasswordResetRequestSchema = z.object({
  email: z.string().min(1).max(255),
});

export type RequestPasswordResetRequestBody = z.infer<typeof requestPasswordResetRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1).max(128),
});

export type ResetPasswordRequestBody = z.infer<typeof resetPasswordRequestSchema>;

export const updateProfileRequestSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  sobrenome: z.string().min(1).max(120).optional(),
  empresa: z.string().max(160).nullable().optional(),
  cargo: z.string().max(120).nullable().optional(),
  avatarUrl: z.string().max(2048).nullable().optional(),
});

export type UpdateProfileRequestBody = z.infer<typeof updateProfileRequestSchema>;

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(1).max(128),
});

export type ChangePasswordRequestBody = z.infer<typeof changePasswordRequestSchema>;

export const assignUserRolesRequestSchema = z.object({
  roles: z.array(z.string()).min(1),
});

export type AssignUserRolesRequestBody = z.infer<typeof assignUserRolesRequestSchema>;
