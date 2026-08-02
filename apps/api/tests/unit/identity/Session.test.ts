import { RefreshToken } from "../../../src/modules/identity/domain/entities/RefreshToken.js";
import { Session } from "../../../src/modules/identity/domain/entities/Session.js";

function buildRefreshToken(
  id: string,
  overrides: Partial<Parameters<typeof RefreshToken.create>[0]> = {},
) {
  return RefreshToken.create({
    id,
    sessionId: "session-1",
    tokenHash: `hash-${id}`,
    familyId: "family-1",
    issuedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2026-02-01T00:00:00Z"),
    revokedAt: null,
    replacedByTokenId: null,
    ...overrides,
  });
}

function buildSession(currentRefreshToken = buildRefreshToken("token-1")) {
  return Session.create({
    id: "session-1",
    userId: "user-1",
    status: "ACTIVE",
    userAgent: null,
    ipAddress: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastUsedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2026-02-01T00:00:00Z"),
    currentRefreshToken,
  });
}

describe("RefreshToken", () => {
  it("é considerado reusado depois de substituído", () => {
    const token = buildRefreshToken("token-1");
    expect(token.isReused()).toBe(false);

    token.markReplacedBy("token-2", new Date());

    expect(token.isReused()).toBe(true);
    expect(token.isValid(new Date())).toBe(false);
  });

  it("é considerado expirado quando now >= expiresAt", () => {
    const token = buildRefreshToken("token-1", { expiresAt: new Date("2026-01-01T00:00:00Z") });
    expect(token.isExpired(new Date("2026-01-01T00:00:01Z"))).toBe(true);
  });
});

describe("Session.rotateRefreshToken", () => {
  it("encadeia o token antigo (replacedByTokenId) e troca o atual", () => {
    const oldToken = buildRefreshToken("token-1");
    const session = buildSession(oldToken);
    const newToken = buildRefreshToken("token-2");

    session.rotateRefreshToken(newToken, new Date("2026-01-02T00:00:00Z"));

    expect(session.currentRefreshToken.id).toBe("token-2");
    expect(oldToken.replacedByTokenId).toBe("token-2");
    expect(oldToken.isReused()).toBe(true);
  });

  it("pullTouchedRefreshTokens devolve old+new depois de uma rotação", () => {
    const oldToken = buildRefreshToken("token-1");
    const session = buildSession(oldToken);
    const newToken = buildRefreshToken("token-2");

    session.rotateRefreshToken(newToken, new Date());
    const touched = session.pullTouchedRefreshTokens();

    expect(touched.map((token) => token.id).sort()).toEqual(["token-1", "token-2"]);
    // drena — uma segunda chamada sem nova operação não repete os mesmos tokens
    expect(session.pullTouchedRefreshTokens()).toEqual([session.currentRefreshToken]);
  });

  it("pullTouchedRefreshTokens cai no token atual quando nada foi tocado ainda (sessão nova)", () => {
    const token = buildRefreshToken("token-1");
    const session = buildSession(token);

    expect(session.pullTouchedRefreshTokens()).toEqual([token]);
  });
});

describe("Session.revoke", () => {
  it("marca status REVOKED e revoga o token atual", () => {
    const session = buildSession();
    session.revoke(new Date("2026-01-05T00:00:00Z"));

    expect(session.status).toBe("REVOKED");
    expect(session.currentRefreshToken.revokedAt).toEqual(new Date("2026-01-05T00:00:00Z"));
    expect(session.isActive(new Date("2026-01-06T00:00:00Z"))).toBe(false);
  });
});
