import { OAuthLoginUseCase } from "../../../src/modules/identity/application/use-cases/OAuthLoginUseCase.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeIdGenerator,
  FakePasswordHasher,
  FakeSessionRepository,
  FakeTokenHasher,
  FakeTokenProvider,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const CONFIG = {
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 2_592_000,
  accountLockoutThreshold: 5,
  accountLockoutDurationSeconds: 900,
};

function buildHarness() {
  const userRepository = new FakeUserRepository();
  const sessionRepository = new FakeSessionRepository();
  const auditLogRepository = new FakeAuditLogRepository();

  const useCase = new OAuthLoginUseCase(
    userRepository,
    sessionRepository,
    auditLogRepository,
    new FakePasswordHasher(),
    new FakeTokenProvider(),
    new FakeTokenHasher(),
    new FakeIdGenerator(),
    new FakeClock(NOW),
    CONFIG,
  );

  return { useCase, userRepository, auditLogRepository };
}

describe("OAuthLoginUseCase", () => {
  it("provisiona um usuário novo (VIEWER) na primeira vez que o e-mail aparece via OAuth", async () => {
    const { useCase, userRepository, auditLogRepository } = buildHarness();

    const result = await useCase.execute({
      profile: { email: "novo@example.com", name: "Ana Silva" },
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    expect(result.accessToken).toBeDefined();
    expect(result.user.roles).toEqual(["VIEWER"]);

    const persisted = await userRepository.findByEmail(Email.create("novo@example.com"));
    expect(persisted?.nome).toBe("Ana");
    expect(persisted?.sobrenome).toBe("Silva");
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("OAUTH_LOGIN_SUCCESS");
  });

  it("reutiliza o usuário existente na segunda vez, sem duplicar", async () => {
    const { useCase, userRepository } = buildHarness();

    await useCase.execute({
      profile: { email: "repetido@example.com", name: "X" },
      ipAddress: null,
      userAgent: null,
    });
    await useCase.execute({
      profile: { email: "repetido@example.com", name: "X" },
      ipAddress: null,
      userAgent: null,
    });

    const persisted = await userRepository.findByEmail(Email.create("repetido@example.com"));
    expect(persisted).not.toBeNull();
  });

  it("atualiza lastLoginAt a cada login via OAuth", async () => {
    const { useCase, userRepository } = buildHarness();

    await useCase.execute({
      profile: { email: "user@example.com", name: null },
      ipAddress: null,
      userAgent: null,
    });

    const persisted = await userRepository.findByEmail(Email.create("user@example.com"));
    expect(persisted?.lastLoginAt).toEqual(NOW);
  });
});
