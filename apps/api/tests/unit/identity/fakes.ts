/**
 * Fakes em memória para os ports do módulo identity — usados pelos testes
 * de use case (application layer), sem nenhuma dependência real de
 * Postgres/Redis/Argon2/JWT. `FakeSessionRepository` reconstrói a mesma
 * semântica de "matchedToken pode ser antigo" do PrismaSessionRepository
 * real, para os testes de detecção de reuso serem fiéis.
 */
import type {
  AccessTokenClaims,
  ITokenProvider,
} from "../../../src/application/ports/ITokenProvider.js";
import type { IPasswordHasher } from "../../../src/application/ports/IPasswordHasher.js";
import { AuditLogEntry } from "../../../src/modules/identity/domain/entities/AuditLogEntry.js";
import { PasswordResetToken } from "../../../src/modules/identity/domain/entities/PasswordResetToken.js";
import {
  RefreshToken,
  type RefreshTokenProps,
} from "../../../src/modules/identity/domain/entities/RefreshToken.js";
import {
  Session,
  type SessionProps,
  type SessionStatus,
} from "../../../src/modules/identity/domain/entities/Session.js";
import type { User } from "../../../src/modules/identity/domain/entities/User.js";
import type { IAuditLogRepository } from "../../../src/modules/identity/domain/repositories/IAuditLogRepository.js";
import type { IPasswordResetTokenRepository } from "../../../src/modules/identity/domain/repositories/IPasswordResetTokenRepository.js";
import type { ISessionRepository } from "../../../src/modules/identity/domain/repositories/ISessionRepository.js";
import type { IUserRepository } from "../../../src/modules/identity/domain/repositories/IUserRepository.js";
import type { Email } from "../../../src/modules/identity/domain/value-objects/Email.js";
import type { IClock } from "../../../src/modules/identity/application/ports/IClock.js";
import type { IEmailProvider } from "../../../src/modules/identity/application/ports/IEmailProvider.js";
import type { IIdGenerator } from "../../../src/modules/identity/application/ports/IIdGenerator.js";
import type {
  ILoginAttemptTracker,
  LoginAttemptState,
} from "../../../src/modules/identity/application/ports/ILoginAttemptTracker.js";
import type { ITokenHasher } from "../../../src/modules/identity/application/ports/ITokenHasher.js";
import { Tenant } from "../../../src/modules/tenant/domain/entities/Tenant.js";
import { TenantResourceOwnership } from "../../../src/modules/tenant/domain/entities/TenantResourceOwnership.js";
import type { ITenantRepository } from "../../../src/modules/tenant/domain/repositories/ITenantRepository.js";
import type { ITenantResourceOwnershipRepository } from "../../../src/modules/tenant/domain/repositories/ITenantResourceOwnershipRepository.js";

export class FakeUserRepository implements IUserRepository {
  private readonly usersById = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    for (const user of this.usersById.values()) {
      if (user.email.equals(email)) return user;
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return [...this.usersById.values()];
  }

  async save(user: User): Promise<void> {
    this.usersById.set(user.id, user);
  }

  seed(user: User): void {
    this.usersById.set(user.id, user);
  }
}

type SessionRow = Omit<SessionProps, "currentRefreshToken">;

export class FakeSessionRepository implements ISessionRepository {
  private readonly sessionRows = new Map<string, SessionRow>();
  private readonly tokenRows = new Map<string, RefreshTokenProps>();
  private readonly tokenIdByHash = new Map<string, string>();

  async findById(id: string): Promise<Session | null> {
    const row = this.sessionRows.get(id);
    if (!row) return null;
    const tokenProps = this.currentTokenPropsForSession(id);
    return tokenProps ? this.toDomain(row, tokenProps) : null;
  }

  async findByRefreshTokenHash(tokenHash: string): Promise<Session | null> {
    const tokenId = this.tokenIdByHash.get(tokenHash);
    if (!tokenId) return null;
    const tokenProps = this.tokenRows.get(tokenId);
    if (!tokenProps) return null;
    const row = this.sessionRows.get(tokenProps.sessionId);
    return row ? this.toDomain(row, tokenProps) : null;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const results: Session[] = [];
    for (const row of this.sessionRows.values()) {
      if (row.userId === userId && row.status === "ACTIVE" && row.expiresAt > new Date()) {
        const tokenProps = this.currentTokenPropsForSession(row.id);
        if (tokenProps) results.push(this.toDomain(row, tokenProps));
      }
    }
    return results;
  }

  async save(session: Session): Promise<void> {
    const props = session.toProps();
    const row: SessionRow = {
      id: props.id,
      userId: props.userId,
      status: props.status,
      userAgent: props.userAgent,
      ipAddress: props.ipAddress,
      createdAt: props.createdAt,
      lastUsedAt: props.lastUsedAt,
      expiresAt: props.expiresAt,
    };
    this.sessionRows.set(props.id, row);

    for (const token of session.pullTouchedRefreshTokens()) {
      const tokenProps = token.toProps();
      this.tokenRows.set(tokenProps.id, tokenProps);
      this.tokenIdByHash.set(tokenProps.tokenHash, tokenProps.id);
    }
  }

  private currentTokenPropsForSession(sessionId: string): RefreshTokenProps | undefined {
    let latest: RefreshTokenProps | undefined;
    for (const tokenProps of this.tokenRows.values()) {
      if (tokenProps.sessionId === sessionId && tokenProps.replacedByTokenId === null) {
        if (!latest || tokenProps.issuedAt > latest.issuedAt) latest = tokenProps;
      }
    }
    return latest;
  }

  private toDomain(row: SessionRow, tokenProps: RefreshTokenProps): Session {
    return Session.create({
      ...row,
      status: row.status as SessionStatus,
      currentRefreshToken: RefreshToken.create({ ...tokenProps }),
    });
  }
}

export class FakeAuditLogRepository implements IAuditLogRepository {
  readonly entries: AuditLogEntry[] = [];

  async append(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }
}

const FAKE_HASH_PREFIX = "$argon2id$fake$";

export class FakePasswordHasher implements IPasswordHasher {
  async hash(plainText: string): Promise<string> {
    return `${FAKE_HASH_PREFIX}${plainText}`;
  }

  async verify(plainText: string, hash: string): Promise<boolean> {
    return hash === `${FAKE_HASH_PREFIX}${plainText}`;
  }
}

export class FakeTokenProvider implements ITokenProvider {
  signAccessToken(claims: AccessTokenClaims, expiresInSeconds: number): string {
    return JSON.stringify({ claims, expiresInSeconds });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return (JSON.parse(token) as { claims: AccessTokenClaims }).claims;
  }
}

export class FakeTokenHasher implements ITokenHasher {
  hash(rawToken: string): string {
    return `hash:${rawToken}`;
  }
}

export class FakeLoginAttemptTracker implements ILoginAttemptTracker {
  private readonly counts = new Map<string, number>();

  constructor(private readonly blockThreshold = 1000) {}

  async recordFailure(identifier: string): Promise<LoginAttemptState> {
    const count = (this.counts.get(identifier) ?? 0) + 1;
    this.counts.set(identifier, count);
    return { failureCount: count, isBlocked: count >= this.blockThreshold };
  }

  async recordSuccess(identifier: string): Promise<void> {
    this.counts.delete(identifier);
  }

  async getState(identifier: string): Promise<LoginAttemptState> {
    const count = this.counts.get(identifier) ?? 0;
    return { failureCount: count, isBlocked: count >= this.blockThreshold };
  }
}

export class FakeIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }

  generateSecureToken(): string {
    this.counter += 1;
    return `raw-token-${this.counter}`;
  }
}

export class FakePasswordResetTokenRepository implements IPasswordResetTokenRepository {
  private readonly tokensById = new Map<string, PasswordResetToken>();

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    for (const token of this.tokensById.values()) {
      if (token.toProps().tokenHash === tokenHash) return token;
    }
    return null;
  }

  async save(token: PasswordResetToken): Promise<void> {
    this.tokensById.set(token.id, token);
  }
}

export class FakeEmailProvider implements IEmailProvider {
  readonly sentEmails: { to: string; resetLink: string }[] = [];

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    this.sentEmails.push({ to, resetLink });
  }
}

export class FakeTenantRepository implements ITenantRepository {
  private readonly tenantsById = new Map<string, Tenant>();

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantsById.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    for (const tenant of this.tenantsById.values()) {
      if (tenant.slug === slug) return tenant;
    }
    return null;
  }

  async save(tenant: Tenant): Promise<void> {
    this.tenantsById.set(tenant.id, tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return [...this.tenantsById.values()];
  }

  seed(tenant: Tenant): void {
    this.tenantsById.set(tenant.id, tenant);
  }
}

export class FakeTenantResourceOwnershipRepository implements ITenantResourceOwnershipRepository {
  private readonly ownerships: TenantResourceOwnership[] = [];

  async save(ownership: TenantResourceOwnership): Promise<void> {
    this.ownerships.push(ownership);
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<TenantResourceOwnership | null> {
    return (
      this.ownerships.find(
        (ownership) =>
          ownership.resourceType === resourceType && ownership.resourceId === resourceId,
      ) ?? null
    );
  }

  async listResourceIds(tenantId: string, resourceType: string): Promise<string[]> {
    return this.ownerships
      .filter(
        (ownership) => ownership.tenantId === tenantId && ownership.resourceType === resourceType,
      )
      .map((ownership) => ownership.resourceId);
  }

  async deleteByTenantAndType(tenantId: string, resourceType: string): Promise<void> {
    const remaining = this.ownerships.filter(
      (ownership) => !(ownership.tenantId === tenantId && ownership.resourceType === resourceType),
    );
    this.ownerships.length = 0;
    this.ownerships.push(...remaining);
  }

  seed(ownership: TenantResourceOwnership): void {
    this.ownerships.push(ownership);
  }

  clear(): void {
    this.ownerships.length = 0;
  }
}

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
