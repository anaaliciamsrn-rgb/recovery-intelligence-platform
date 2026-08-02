/**
 * Provisiona o primeiro usuário (ex.: admin). Deliberadamente fora da API —
 * cadastro/gestão de usuários via HTTP é escopo futuro (ver ADR 0010). Lê
 * env vars próprias (não as do schema Zod do servidor: este script não roda
 * junto com o processo da API, não faz sentido exigi-las no boot do server).
 *
 * Uso: SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=... pnpm --filter @rip/api prisma:seed
 */
import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD são obrigatórias. Exemplo:\n" +
        "  SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=... pnpm --filter @rip/api prisma:seed",
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error(
      "SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres (mesma política do domínio).",
    );
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      id: randomUUID(),
      email,
      passwordHash,
      roles: ["ADMIN"],
    },
  });

  console.log(`Usuário admin "${user.email}" criado/confirmado (id: ${user.id}).`);
}

main()
  .catch((error: unknown) => {
    console.error("Falha ao rodar o seed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
