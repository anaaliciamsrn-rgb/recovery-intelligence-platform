import { AssignUserRolesUseCase } from "../../../src/modules/identity/application/use-cases/AssignUserRolesUseCase.js";
import { User } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import { FakeAuditLogRepository, FakeClock, FakeIdGenerator, FakeUserRepository } from "./fakes.js";

const NOW = new Date("2026-01-01T00:00:00Z");

function buildUser(id: string, roles: string[]) {
  return User.create({
    id,
    email: Email.create(`${id}@example.com`),
    passwordHash: PasswordHash.fromHash("$argon2id$fake$hash"),
    roles: roles as never,
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function buildHarness() {
  const userRepository = new FakeUserRepository();
  const auditLogRepository = new FakeAuditLogRepository();
  const useCase = new AssignUserRolesUseCase(
    userRepository,
    auditLogRepository,
    new FakeIdGenerator(),
    new FakeClock(NOW),
  );
  return { useCase, userRepository, auditLogRepository };
}

describe("AssignUserRolesUseCase", () => {
  it("atribui o novo papel e audita USER_ROLES_ASSIGNED", async () => {
    const { useCase, userRepository, auditLogRepository } = buildHarness();
    const admin = buildUser("admin-1", ["ADMIN"]);
    const viewer = buildUser("viewer-1", ["VIEWER"]);
    userRepository.seed(admin);
    userRepository.seed(viewer);

    await useCase.execute({
      targetUserId: "viewer-1",
      roles: ["ANALYST"],
      actorUserId: "admin-1",
      ipAddress: "203.0.113.1",
      userAgent: "jest",
    });

    const persisted = await userRepository.findById("viewer-1");
    expect(persisted?.roles).toEqual(["ANALYST"]);
    expect(auditLogRepository.entries.at(-1)?.toProps().eventType).toBe("USER_ROLES_ASSIGNED");
  });

  it("rejeita papel desconhecido", async () => {
    const { useCase, userRepository } = buildHarness();
    userRepository.seed(buildUser("viewer-1", ["VIEWER"]));

    await expect(
      useCase.execute({
        targetUserId: "viewer-1",
        roles: ["SUPERUSER"],
        actorUserId: "admin-1",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "VALIDATION" });
  });

  it("rejeita remover ADMIN do último administrador do sistema", async () => {
    const { useCase, userRepository } = buildHarness();
    userRepository.seed(buildUser("admin-1", ["ADMIN"]));

    await expect(
      useCase.execute({
        targetUserId: "admin-1",
        roles: ["VIEWER"],
        actorUserId: "admin-1",
        ipAddress: null,
        userAgent: null,
      }),
    ).rejects.toMatchObject({ kind: "CONFLICT" });
  });

  it("permite remover ADMIN quando existe outro administrador", async () => {
    const { useCase, userRepository } = buildHarness();
    userRepository.seed(buildUser("admin-1", ["ADMIN"]));
    userRepository.seed(buildUser("admin-2", ["ADMIN"]));

    await useCase.execute({
      targetUserId: "admin-1",
      roles: ["VIEWER"],
      actorUserId: "admin-2",
      ipAddress: null,
      userAgent: null,
    });

    const persisted = await userRepository.findById("admin-1");
    expect(persisted?.roles).toEqual(["VIEWER"]);
  });
});
