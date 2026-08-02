import { UpdateProfileUseCase } from "../../../src/modules/identity/application/use-cases/UpdateProfileUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import { FakeAuditLogRepository, FakeClock, FakeIdGenerator, FakeUserRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildHarness() {
  const userRepository = new FakeUserRepository();
  const auditLogRepository = new FakeAuditLogRepository();

  const user = User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash("$argon2id$fake$hash"),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    nome: "Nome Antigo",
    createdAt: NOW,
    updatedAt: NOW,
  });
  userRepository.seed(user);

  const useCase = new UpdateProfileUseCase(
    userRepository,
    auditLogRepository,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
  return { useCase, userRepository, auditLogRepository };
}

describe("UpdateProfileUseCase", () => {
  it("atualiza os campos de perfil informados e audita PROFILE_UPDATED", async () => {
    const { useCase, userRepository, auditLogRepository } = buildHarness();

    const result = await useCase.execute({
      userId: "user-1",
      nome: "Nome Novo",
      cargo: "Gerente",
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    expect(result.nome).toBe("Nome Novo");
    expect(result.cargo).toBe("Gerente");

    const persisted = await userRepository.findById("user-1");
    expect(persisted?.nome).toBe("Nome Novo");
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("PROFILE_UPDATED");
  });

  it("nunca toca email/senha/papéis — não há como nem passar isso no input", async () => {
    const { useCase, userRepository } = buildHarness();

    await useCase.execute({
      userId: "user-1",
      empresa: "Nova Empresa",
      ipAddress: null,
      userAgent: null,
    });

    const persisted = await userRepository.findById("user-1");
    expect(persisted?.email.toString()).toBe("user@example.com");
    expect(persisted?.roles).toEqual(["VIEWER"]);
  });

  it("lança NOT_FOUND para usuário inexistente", async () => {
    const { useCase } = buildHarness();

    await expect(
      useCase.execute({ userId: "inexistente", nome: "X", ipAddress: null, userAgent: null }),
    ).rejects.toMatchObject({ kind: "NOT_FOUND" });
  });
});
