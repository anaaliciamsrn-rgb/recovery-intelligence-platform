import { User, type UserProps } from "../../../src/modules/identity/domain/entities/User.js";
import { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import { PasswordHash } from "../../../src/modules/identity/domain/value-objects/PasswordHash.js";
import { Permission } from "../../../src/modules/identity/domain/value-objects/Permission.js";

const VALID_HASH = "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$aGFzaHZhbHVl";

function buildUser(overrides: Partial<UserProps> = {}): User {
  return User.create({
    id: "user-1",
    email: Email.create("user@example.com"),
    passwordHash: PasswordHash.fromHash(VALID_HASH),
    roles: ["VIEWER"],
    accountStatus: "ACTIVE",
    failedLoginAttempts: 0,
    lockedUntil: null,
    mfaEnabled: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

describe("User", () => {
  describe("canAuthenticate", () => {
    it("permite quando ACTIVE", () => {
      expect(buildUser({ accountStatus: "ACTIVE" }).canAuthenticate(new Date())).toBe(true);
    });

    it("nunca permite quando DISABLED", () => {
      expect(buildUser({ accountStatus: "DISABLED" }).canAuthenticate(new Date())).toBe(false);
    });

    it("bloqueia quando LOCKED e lockedUntil ainda no futuro", () => {
      const now = new Date("2026-01-01T00:00:00Z");
      const user = buildUser({
        accountStatus: "LOCKED",
        lockedUntil: new Date("2026-01-01T00:10:00Z"),
      });
      expect(user.canAuthenticate(now)).toBe(false);
    });

    it("permite quando LOCKED mas lockedUntil já passou", () => {
      const now = new Date("2026-01-01T00:20:00Z");
      const user = buildUser({
        accountStatus: "LOCKED",
        lockedUntil: new Date("2026-01-01T00:10:00Z"),
      });
      expect(user.canAuthenticate(now)).toBe(true);
    });
  });

  describe("recordFailedLogin", () => {
    it("incrementa o contador sem trancar antes do limiar", () => {
      const user = buildUser({ failedLoginAttempts: 3 });
      user.recordFailedLogin(new Date(), 5, 900);

      expect(user.failedLoginAttempts).toBe(4);
      expect(user.accountStatus).toBe("ACTIVE");
      expect(user.lockedUntil).toBeNull();
    });

    it("tranca a conta ao atingir o limiar, com lockedUntil = now + duração", () => {
      const now = new Date("2026-01-01T00:00:00Z");
      const user = buildUser({ failedLoginAttempts: 4 });

      user.recordFailedLogin(now, 5, 900);

      expect(user.failedLoginAttempts).toBe(5);
      expect(user.accountStatus).toBe("LOCKED");
      expect(user.lockedUntil).toEqual(new Date("2026-01-01T00:15:00Z"));
    });
  });

  describe("recordSuccessfulLogin", () => {
    it("zera o contador e destranca a conta", () => {
      const user = buildUser({
        accountStatus: "LOCKED",
        failedLoginAttempts: 9,
        lockedUntil: new Date("2026-01-01T00:15:00Z"),
      });

      user.recordSuccessfulLogin(new Date("2026-01-01T00:20:00Z"));

      expect(user.failedLoginAttempts).toBe(0);
      expect(user.lockedUntil).toBeNull();
      expect(user.accountStatus).toBe("ACTIVE");
    });
  });

  describe("hasPermission", () => {
    it("ADMIN tem permissão de revogar qualquer sessão", () => {
      const admin = buildUser({ roles: ["ADMIN"] });
      expect(admin.hasPermission(Permission.REVOKE_ANY_SESSION)).toBe(true);
    });

    it("VIEWER não tem permissão de revogar qualquer sessão", () => {
      const viewer = buildUser({ roles: ["VIEWER"] });
      expect(viewer.hasPermission(Permission.REVOKE_ANY_SESSION)).toBe(false);
    });
  });
});
