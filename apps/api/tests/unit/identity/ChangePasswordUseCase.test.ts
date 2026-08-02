import { ChangePasswordUseCase } from "../../../src/modules/identity/application/use-cases/ChangePasswordUseCase.js";
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
const CURRENT_PASSWORD = "senha-atual-1234567";

async function buildHarness() {
  const userRepository = new FakeUserRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const passwordHasher = new FakePasswordHasher();

  const user = User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash(await passwordHasher.hash(CURRENT_PASSWORD)),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
  userRepository.seed(user);

  const useCase = new ChangePasswordUseCase(
    userRepository,
    auditLogRepository,
    passwordHasher,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
  return { useCase, userRepository, auditLogRepository, passwordHasher };
}

describe("ChangePasswordUseCase", () => {
  it("troca a senha quando a senha atual está correta e audita PASSWORD_CHANGED", async () => {
    const { useCase, userRepository, auditLogRepository, passwordHasher } = await buildHarness();

    await useCase.execute({
      userId: "user-1",
      currentPassword: CURRENT_PASSWORD,
      newPassword: "senha-nova-7654321",
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    const persisted = await userRepository.findById("user-1");
    expect(
      await passwordHasher.verify("senha-nova-7654321", persisted!.passwordHash.toString()),
    ).toBe(true);
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("PASSWORD_CHANGED");
  });

  it("rejeita quando a senha atual está incorreta", async () => {
    const { useCase } = await buildHarness();

    await expect(
      useCase.execute({
        userId: "user-1",
        currentPassword: "senha-errada",
        newPassword: "senha-nova-7654321",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED" });
  });
});
