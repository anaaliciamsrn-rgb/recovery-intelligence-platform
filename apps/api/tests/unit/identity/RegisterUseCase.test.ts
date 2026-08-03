import { RegisterUseCase } from "../../../src/modules/identity/application/use-cases/RegisterUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import { CreateTenantUseCase } from "../../../src/modules/tenant/application/use-cases/CreateTenantUseCase.js";
import { RegisterTenantResourceUseCase } from "../../../src/modules/tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeIdGenerator,
  FakePasswordHasher,
  FakeTenantRepository,
  FakeTenantResourceOwnershipRepository,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildHarness() {
  const userRepository = new FakeUserRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const passwordHasher = new FakePasswordHasher();
  const clock = new FakeClock(NOW);
  const idGenerator = new FakeIdGenerator();
  const tenantRepository = new FakeTenantRepository();
  const tenantResourceOwnershipRepository = new FakeTenantResourceOwnershipRepository();
  const createTenantUseCase = new CreateTenantUseCase(tenantRepository, idGenerator, clock);
  const registerTenantResourceUseCase = new RegisterTenantResourceUseCase(
    tenantRepository,
    tenantResourceOwnershipRepository,
    idGenerator,
    clock,
  );
  const useCase = new RegisterUseCase(
    userRepository,
    auditLogRepository,
    passwordHasher,
    idGenerator,
    clock,
    tenantRepository,
    createTenantUseCase,
    registerTenantResourceUseCase,
  );
  return {
    useCase,
    userRepository,
    auditLogRepository,
    tenantRepository,
    tenantResourceOwnershipRepository,
  };
}

describe("RegisterUseCase", () => {
  it("cria um usuário VIEWER e audita REGISTER_SUCCESS", async () => {
    const { useCase, userRepository, auditLogRepository, tenantResourceOwnershipRepository } =
      buildHarness();

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

    const ownership = await tenantResourceOwnershipRepository.findByResource("User", result.id);
    expect(ownership).not.toBeNull();

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

  it("duas contas com o mesmo nome de empresa (normalizado) caem no mesmo tenant", async () => {
    const { useCase, tenantResourceOwnershipRepository } = buildHarness();

    const primeiro = await useCase.execute({
      email: "colega1@acme.com",
      password: "uma-senha-bem-forte-123",
      nome: "Colega",
      sobrenome: "Um",
      empresa: "Acme Soluções LTDA",
      cargo: null,
      ipAddress: null,
      userAgent: null,
    });
    const segundo = await useCase.execute({
      email: "colega2@acme.com",
      password: "uma-senha-bem-forte-123",
      nome: "Colega",
      sobrenome: "Dois",
      empresa: "Acme Soluções LTDA",
      cargo: null,
      ipAddress: null,
      userAgent: null,
    });

    const ownership1 = await tenantResourceOwnershipRepository.findByResource("User", primeiro.id);
    const ownership2 = await tenantResourceOwnershipRepository.findByResource("User", segundo.id);
    expect(ownership1?.tenantId).toBe(ownership2?.tenantId);
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
