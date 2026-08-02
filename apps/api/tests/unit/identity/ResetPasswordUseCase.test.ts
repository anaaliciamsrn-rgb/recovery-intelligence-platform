import { ResetPasswordUseCase } from "../../../src/modules/identity/application/use-cases/ResetPasswordUseCase.js";
import { PasswordResetToken } from "../../../src/modules/identity/domain/entities/PasswordResetToken.js";
import { RefreshToken } from "../../../src/modules/identity/domain/entities/RefreshToken.js";
import { Session } from "../../../src/modules/identity/domain/entities/Session.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeIdGenerator,
  FakePasswordHasher,
  FakePasswordResetTokenRepository,
  FakeSessionRepository,
  FakeTokenHasher,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const RAW_TOKEN = "raw-reset-token";

async function buildHarness() {
  const userRepository = new FakeUserRepository();
  const passwordResetTokenRepository = new FakePasswordResetTokenRepository();
  const sessionRepository = new FakeSessionRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenHasher = new FakeTokenHasher();

  const user = User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash(await passwordHasher.hash("senha-antiga-123456")),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
  userRepository.seed(user);

  const resetToken = PasswordResetToken.create({
    id: "reset-token-1",
    userId: "user-1",
    tokenHash: tokenHasher.hash(RAW_TOKEN),
    expiresAt: new Date(NOW.getTime() + 3_600_000),
    usedAt: null,
    createdAt: NOW,
  });
  await passwordResetTokenRepository.save(resetToken);

  // `FakeSessionRepository.findActiveByUserId` compara `expiresAt` com o
  // relógio real (`new Date()`), não com o `FakeClock` — por isso um valor
  // bem distante no futuro, não relativo a `NOW`, evita flakiness dependendo
  // de quando o teste realmente roda.
  const farFutureExpiry = new Date("2099-01-01T00:00:00Z");
  const activeSession = Session.create({
    id: "session-1",
    userId: "user-1",
    status: "ACTIVE",
    userAgent: null,
    ipAddress: null,
    createdAt: NOW,
    lastUsedAt: NOW,
    expiresAt: farFutureExpiry,
    currentRefreshToken: RefreshToken.create({
      id: "refresh-1",
      sessionId: "session-1",
      tokenHash: "hash:whatever",
      familyId: "family-1",
      issuedAt: NOW,
      expiresAt: farFutureExpiry,
      revokedAt: null,
      replacedByTokenId: null,
    }),
  });
  await sessionRepository.save(activeSession);

  const useCase = new ResetPasswordUseCase(
    userRepository,
    passwordResetTokenRepository,
    sessionRepository,
    auditLogRepository,
    passwordHasher,
    tokenHasher,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );

  return {
    useCase,
    userRepository,
    passwordResetTokenRepository,
    sessionRepository,
    auditLogRepository,
    passwordHasher,
  };
}

describe("ResetPasswordUseCase", () => {
  it("redefine a senha, marca o token como usado e revoga todas as sessões ativas", async () => {
    const { useCase, userRepository, sessionRepository, auditLogRepository, passwordHasher } =
      await buildHarness();

    await useCase.execute({
      token: RAW_TOKEN,
      newPassword: "senha-nova-1234567",
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    const persisted = await userRepository.findById("user-1");
    expect(
      await passwordHasher.verify("senha-nova-1234567", persisted!.passwordHash.toString()),
    ).toBe(true);

    const session = await sessionRepository.findById("session-1");
    expect(session?.status).toBe("REVOKED");

    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("PASSWORD_RESET_COMPLETED");
  });

  it("rejeita token inexistente com erro genérico", async () => {
    const { useCase } = await buildHarness();

    await expect(
      useCase.execute({
        token: "token-que-nao-existe",
        newPassword: "senha-nova-1234567",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED" });
  });

  it("rejeita reapresentação de um token já usado", async () => {
    const { useCase } = await buildHarness();

    await useCase.execute({
      token: RAW_TOKEN,
      newPassword: "senha-nova-1234567",
      ipAddress: null,
      userAgent: null,
    });

    await expect(
      useCase.execute({
        token: RAW_TOKEN,
        newPassword: "outra-senha-1234567",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED" });
  });
});
