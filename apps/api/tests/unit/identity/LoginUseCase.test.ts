import { AppError } from "../../../src/application/errors/AppError.js";
import { LoginUseCase } from "../../../src/modules/identity/application/use-cases/LoginUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import { CreateTenantUseCase } from "../../../src/modules/tenant/application/use-cases/CreateTenantUseCase.js";
import { RegisterTenantResourceUseCase } from "../../../src/modules/tenant/application/use-cases/RegisterTenantResourceUseCase.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeIdGenerator,
  FakeLoginAttemptTracker,
  FakePasswordHasher,
  FakeSessionRepository,
  FakeTenantRepository,
  FakeTenantResourceOwnershipRepository,
  FakeTokenHasher,
  FakeTokenProvider,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CORRECT_PASSWORD = "correct-password-123";
const CONFIG = {
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 2_592_000,
  accountLockoutThreshold: 5,
  accountLockoutDurationSeconds: 900,
};

async function buildHarness(
  userOverrides: Partial<Parameters<typeof User.create>[0]> = {},
  // Alto de propósito: testes de lockout de conta não devem ser confundidos
  // pelo bloqueio do tracker — quem quiser testar o tracker isoladamente
  // passa um limiar baixo explicitamente.
  trackerBlockThreshold = 1000,
) {
  const passwordHasher = new FakePasswordHasher();
  const userRepository = new FakeUserRepository();
  const sessionRepository = new FakeSessionRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const loginAttemptTracker = new FakeLoginAttemptTracker(trackerBlockThreshold);
  const clock = new FakeClock(NOW);

  const user = User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash(await passwordHasher.hash(CORRECT_PASSWORD)),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...userOverrides,
  });
  userRepository.seed(user);

  const tenantIdGenerator = new FakeIdGenerator();
  const tenantRepository = new FakeTenantRepository();
  const tenantResourceOwnershipRepository = new FakeTenantResourceOwnershipRepository();
  tenantResourceOwnershipRepository.seed(
    TenantResourceOwnership.create({
      id: "ownership-1",
      tenantId: "tenant-1",
      resourceType: "User",
      resourceId: user.id,
      createdAt: NOW,
    }),
  );
  const createTenantUseCase = new CreateTenantUseCase(tenantRepository, tenantIdGenerator, clock);
  const registerTenantResourceUseCase = new RegisterTenantResourceUseCase(
    tenantRepository,
    tenantResourceOwnershipRepository,
    tenantIdGenerator,
    clock,
  );

  const useCase = new LoginUseCase(
    userRepository,
    sessionRepository,
    auditLogRepository,
    passwordHasher,
    new FakeTokenProvider(),
    new FakeTokenHasher(),
    loginAttemptTracker,
    new FakeIdGenerator(),
    clock,
    CONFIG,
    tenantRepository,
    createTenantUseCase,
    registerTenantResourceUseCase,
    tenantResourceOwnershipRepository,
  );

  return {
    useCase,
    userRepository,
    auditLogRepository,
    loginAttemptTracker,
    user,
    tenantResourceOwnershipRepository,
  };
}

describe("LoginUseCase", () => {
  it("autentica com sucesso e devolve tokens", async () => {
    const { useCase, auditLogRepository } = await buildHarness();

    const result = await useCase.execute({
      email: "user@example.com",
      password: CORRECT_PASSWORD,
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toEqual({ id: "user-1", email: "user@example.com", roles: ["VIEWER"] });
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("LOGIN_SUCCESS");
  });

  it("rejeita senha errada com a mensagem genérica", async () => {
    const { useCase, auditLogRepository } = await buildHarness();

    await expect(
      useCase.execute({
        email: "user@example.com",
        password: "senha-errada",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED", message: "Credenciais inválidas" });

    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe(
      "LOGIN_FAILURE_BAD_PASSWORD",
    );
  });

  it("email desconhecido devolve exatamente a mesma mensagem genérica de senha errada", async () => {
    const { useCase } = await buildHarness();

    let unknownEmailError: unknown;
    try {
      await useCase.execute({
        email: "ninguem@example.com",
        password: "qualquer-coisa",
        ipAddress: null,
        userAgent: null,
      });
    } catch (error) {
      unknownEmailError = error;
    }

    expect(unknownEmailError).toBeInstanceOf(AppError);
    expect((unknownEmailError as AppError).message).toBe("Credenciais inválidas");
  });

  it("conta trancada (lockedUntil no futuro) é rejeitada com a mesma mensagem genérica", async () => {
    const { useCase, auditLogRepository } = await buildHarness({
      accountStatus: "LOCKED",
      lockedUntil: new Date("2026-01-01T01:00:00Z"),
    });

    await expect(
      useCase.execute({
        email: "user@example.com",
        password: CORRECT_PASSWORD,
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED", message: "Credenciais inválidas" });

    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe(
      "LOGIN_FAILURE_ACCOUNT_LOCKED",
    );
  });

  it("autocura: provisiona um tenant na hora para uma conta sem TenantResourceOwnership", async () => {
    const { useCase, tenantResourceOwnershipRepository, user } = await buildHarness();
    // Simula uma conta inserida fora do fluxo de autocadastro (seed, script
    // administrativo, conta herdada de antes do ADR 0037) — remove o
    // registro que buildHarness já cria por padrão.
    tenantResourceOwnershipRepository.clear();

    await useCase.execute({
      email: "user@example.com",
      password: CORRECT_PASSWORD,
      ipAddress: null,
      userAgent: null,
    });

    const ownership = await tenantResourceOwnershipRepository.findByResource("User", user.id);
    expect(ownership).not.toBeNull();
  });

  it("bloqueia por rate limit antes de tocar no repositório de usuários", async () => {
    const { useCase, loginAttemptTracker, userRepository } = await buildHarness({}, 3);
    const findByEmailSpy = jest.spyOn(userRepository, "findByEmail");

    await loginAttemptTracker.recordFailure("email:user@example.com");
    await loginAttemptTracker.recordFailure("email:user@example.com");
    await loginAttemptTracker.recordFailure("email:user@example.com");

    await expect(
      useCase.execute({
        email: "user@example.com",
        password: CORRECT_PASSWORD,
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED" });

    expect(findByEmailSpy).not.toHaveBeenCalled();
  });

  it("senha errada repetida tranca a conta ao cruzar o limiar", async () => {
    const { useCase, userRepository } = await buildHarness();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await useCase
        .execute({
          email: "user@example.com",
          password: "errada",
          ipAddress: null,
          userAgent: null,
        })
        .catch(() => undefined);
    }

    const persisted = await userRepository.findById("user-1");
    expect(persisted?.accountStatus).toBe("LOCKED");
  });
});
