import { RegisterUseCase } from "../../../src/modules/identity/application/use-cases/RegisterUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeIdGenerator,
  FakePasswordHasher,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildHarness() {
  const userRepository = new FakeUserRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const passwordHasher = new FakePasswordHasher();
  const useCase = new RegisterUseCase(
    userRepository,
    auditLogRepository,
    passwordHasher,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
  return { useCase, userRepository, auditLogRepository };
}

describe("RegisterUseCase", () => {
  it("cria um usuário VIEWER e audita REGISTER_SUCCESS", async () => {
    const { useCase, userRepository, auditLogRepository } = buildHarness();

    const result = await useCase.execute({
      email: "nova@example.com",
      password: "uma-senha-bem-forte-123",
      nome: "Ana",
      sobrenome: "Silva",
      empresa: "Acme",
      cargo: "Analista",
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    expect(result.roles).toEqual(["VIEWER"]);
    expect(result.nome).toBe("Ana");

    const persisted = await userRepository.findByEmail(Email.create("nova@example.com"));
    expect(persisted).not.toBeNull();
    expect(persisted?.empresa).toBe("Acme");
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("REGISTER_SUCCESS");
  });

  it("rejeita e-mail já cadastrado com CONFLICT (revelado ao chamador, diferente do login)", async () => {
    const { useCase, userRepository, auditLogRepository } = buildHarness();
    const existing = User.create({
      id: "user-1",
      email: Email.create("existente@example.com"),
      passwordHash: PasswordHash.fromHash("$argon2id$fake$hash"),
      roles: ["VIEWER"],
      accountStatus: "ACTIVE",
      failedLoginAttempts: 0,
      lockedUntil: null,
      mfaEnabled: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    userRepository.seed(existing);

    await expect(
      useCase.execute({
        email: "existente@example.com",
        password: "uma-senha-bem-forte-123",
        nome: "Outra",
        sobrenome: "Pessoa",
        empresa: null,
        cargo: null,
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "CONFLICT" });

    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe(
      "REGISTER_FAILURE_EMAIL_TAKEN",
    );
  });

  it("rejeita senha fora da política (menos de 12 caracteres)", async () => {
    const { useCase } = buildHarness();

    await expect(
      useCase.execute({
        email: "curta@example.com",
        password: "curta",
        nome: "A",
        sobrenome: "B",
        empresa: null,
        cargo: null,
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toThrow();
  });
});
