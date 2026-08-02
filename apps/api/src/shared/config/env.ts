import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  CORS_ALLOWED_ORIGINS: z.string().default(""),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  // Definido via `ARG BUILD_TIMESTAMP` no Dockerfile (propriedade do artefato de
  // build, não do ambiente de execução) — "unknown" fora de uma imagem buildada.
  BUILD_TIMESTAMP: z.string().default("unknown"),

  // --- Identidade e Controle de Acesso (ver ADR 0007, 0010) ---
  // Sem default: segredo obrigatório, falha rápido no boot se ausente.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET deve ter pelo menos 32 caracteres"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),

  ARGON2_MEMORY_COST_KB: z.coerce.number().int().positive().default(19_456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),

  // Rate limit específico da rota de login — mais estrito que o genérico.
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  LOGIN_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(5),

  ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(10),
  ACCOUNT_LOCKOUT_DURATION_SECONDS: z.coerce.number().int().positive().default(900),

  REFRESH_TOKEN_COOKIE_NAME: z.string().default("rip_refresh_token"),
  // Independente de NODE_ENV: descreve se a conexão real está atrás de HTTPS
  // (não se o processo está "em modo produção").
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  // Origem pública do frontend — usada para montar links absolutos em
  // e-mails (ex.: link de redefinição de senha) e como destino de redirect
  // pós-OAuth. Nunca a origem da própria API.
  APP_URL: z.string().url().default("http://localhost:5173"),
  PASSWORD_RESET_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3_600),

  // --- E-mail (ver ADR 0037) ---
  // Sem SMTP_HOST configurado, o container usa `ConsoleEmailProvider`
  // (imprime o e-mail/link no log — nunca falha silenciosamente, nunca finge
  // enviar de fato). Nenhuma credencial tem default.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z
    .string()
    .default("Recovery Intelligence Platform <no-reply@recovery-intelligence.local>"),

  // --- OAuth (ver ADR 0037) ---
  // Cada provedor só é registrado no container (rotas de authorize/callback
  // montadas, botão real exposto pelo frontend via GET /auth/oauth/providers)
  // quando client id + secret estão presentes. Sem eles, a infraestrutura
  // existe mas fica inativa — nunca um botão que finge funcionar.
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  MICROSOFT_OAUTH_CLIENT_ID: z.string().optional(),
  MICROSOFT_OAUTH_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_OAUTH_REDIRECT_URI: z.string().url().optional(),
  MICROSOFT_OAUTH_TENANT_ID: z.string().default("common"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();
