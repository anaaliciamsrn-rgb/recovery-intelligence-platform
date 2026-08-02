import { RequestPasswordResetUseCase } from "../../../src/modules/identity/application/use-cases/RequestPasswordResetUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeEmailProvider,
  FakeIdGenerator,
  FakePasswordResetTokenRepository,
  FakeTokenHasher,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const APP_URL = "https://app.example.com";
const TOKEN_TTL_SECONDS = 3_600;

function buildHarness() {
  const userRepository = new FakeUserRepository();
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const emailProvider = new FakeEmailProvider();

  const user = User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash("$argon2id$fake$hash"),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
  userRepository.seed(user);

  const useCase = new RequestPasswordResetUseCase(
    userRepository,
    passwordResetTokenRepository,
    auditLogRepository,
    emailProvider,
    new FakeTokenHasher(),
    new FakeIdGenerator(),
    new FakeClock(NOW),
    APP_URL,
    TOKEN_TTL_SECONDS,
  );

  return { useCase, passwordResetTokenRepository, auditLogRepository, emailProvider };
}

describe("RequestPasswordResetUseCase", () => {
  it("envia o e-mail com o link de redefinição quando o usuário existe", async () => {
    const { useCase, emailProvider, auditLogRepository } = buildHarness();

    await useCase.execute({
      email: "user@example.com",
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    expect(emailProvider.sentEmails).toHaveLength(1);
    expect(emailProvider.sentEmails[0]?.to).toBe("user@example.com");
    expect(emailProvider.sentEmails[0]?.resetLink).toContain(`${APP_URL}/redefinir-senha?token=`);
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("PASSWORD_RESET_REQUESTED");
  });

  it("nunca envia e-mail nem revela nada quando o e-mail não existe (anti-enumeração)", async () => {
    const { useCase, emailProvider, auditLogRepository } = buildHarness();

    await expect(
      useCase.execute({ email: "ninguem@example.com", ipAddress: null, userAgent: null }),
    ).resolves.toBeUndefined();

    expect(emailProvider.sentEmails).toHaveLength(0);
    expect(auditLogRepository.entries).toHaveLength(0);
  });

  it("silencia formato de e-mail inválido sem lançar erro", async () => {
    const { useCase, emailProvider } = buildHarness();

    await expect(
      useCase.execute({ email: "não-é-um-email", ipAddress: null, userAgent: null }),
    ).resolves.toBeUndefined();
    expect(emailProvider.sentEmails).toHaveLength(0);
  });
});
