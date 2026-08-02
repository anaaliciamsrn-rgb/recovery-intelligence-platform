import { RefreshTokenUseCase } from "../../../src/modules/identity/application/use-cases/RefreshTokenUseCase.js";
import { RefreshToken } from "../../../src/modules/identity/domain/entities/RefreshToken.js";
import { Session } from "../../../src/modules/identity/domain/entities/Session.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import {
  FakeAuditLogRepository,
  FakeClock,
  FakeIdGenerator,
  FakeSessionRepository,
  FakeTokenHasher,
  FakeTokenProvider,
  FakeUserRepository,
} from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CONFIG = {
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 2_592_000,
  accountLockoutThreshold: 5,
  accountLockoutDurationSeconds: 900,
};

async function buildHarness() {
  const sessionRepository = new FakeSessionRepository();
  const userRepository = new FakeUserRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const tokenHasher = new FakeTokenHasher();
  const idGenerator = new FakeIdGenerator();
  const clock = new FakeClock(NOW);

  const user = User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash("$argon2id$fake$whatever"),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
  await userRepository.save(user);

  const initialRawToken = "raw-initial-token";
  const initialRefreshToken = RefreshToken.create({
    id: "token-1",
    sessionId: "session-1",
    tokenHash: tokenHasher.hash(initialRawToken),
    familyId: "family-1",
    issuedAt: NOW,
    expiresAt: new Date(NOW.getTime() + THIRTY_DAYS_MS),
    revokedAt: null,
    replacedByTokenId: null,
  });
  const session = Session.create({
    id: "session-1",
    userId: user.id,
    status: "ACTIVE",
    userAgent: null,
    ipAddress: null,
    createdAt: NOW,
    lastUsedAt: NOW,
    expiresAt: initialRefreshToken.expiresAt,
    currentRefreshToken: initialRefreshToken,
  });
  await sessionRepository.save(session);

  const useCase = new RefreshTokenUseCase(
    sessionRepository,
    userRepository,
    auditLogRepository,
    new FakeTokenProvider(),
    tokenHasher,
    idGenerator,
    clock,
    CONFIG,
  );

  return { useCase, sessionRepository, auditLogRepository, initialRawToken };
}

describe("RefreshTokenUseCase", () => {
  it("rotaciona com sucesso e devolve um novo par de tokens", async () => {
    const { useCase, initialRawToken } = await buildHarness();

    const result = await useCase.execute({
      refreshToken: initialRawToken,
      ipAddress: null,
      userAgent: null,
    });

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).not.toBe(initialRawToken);
  });

  it("detecta reuso do token antigo e revoga a sessão inteira", async () => {
    const { useCase, sessionRepository, auditLogRepository, initialRawToken } =
      await buildHarness();

    await useCase.execute({ refreshToken: initialRawToken, ipAddress: null, userAgent: null });

    await expect(
      useCase.execute({ refreshToken: initialRawToken, ipAddress: null, userAgent: null }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED", message: "Sessão inválida ou expirada" });

    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe(
      "REFRESH_TOKEN_REUSE_DETECTED",
    );

    const session = await sessionRepository.findById("session-1");
    expect(session?.status).toBe("REVOKED");
  });

  it("depois de um reuso detectado, até o token novo (nunca usado) para de funcionar", async () => {
    const { useCase, initialRawToken } = await buildHarness();

    const firstRotation = await useCase.execute({
      refreshToken: initialRawToken,
      ipAddress: null,
      userAgent: null,
    });

    // Reapresenta o token antigo -> detecta reuso, revoga a sessão inteira.
    await useCase
      .execute({ refreshToken: initialRawToken, ipAddress: null, userAgent: null })
      .catch(() => undefined);

    // O token da primeira rotação nunca foi "reusado" em si, mas a sessão
    // já está revogada — a rede de segurança do repositório precisa cobrir isso.
    await expect(
      useCase.execute({
        refreshToken: firstRotation.refreshToken,
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED" });
  });

  it("token desconhecido devolve erro genérico", async () => {
    const { useCase } = await buildHarness();

    await expect(
      useCase.execute({ refreshToken: "token-que-nao-existe", ipAddress: null, userAgent: null }),
    ).rejects.toMatchObject({ kind: "UNAUTHORIZED", message: "Sessão inválida ou expirada" });
  });
});
