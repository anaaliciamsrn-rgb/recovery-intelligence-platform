import { AppError } from "../../../../application/errors/AppError.js";
import type { ITokenProvider } from "../../../../application/ports/ITokenProvider.js";
import { AuditLogEntry, type AuditEventType } from "../../domain/entities/AuditLogEntry.js";
import { RefreshToken } from "../../domain/entities/RefreshToken.js";
import type { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IdentityModuleConfig } from "../IdentityModuleConfig.js";
import type { IClock } from "../ports/IClock.js";
import type { IIdGenerator } from "../ports/IIdGenerator.js";
import type { ITokenHasher } from "../ports/ITokenHasher.js";

export interface RefreshTokenInput {
  refreshToken: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

const GENERIC_REFRESH_ERROR_MESSAGE = "Sessão inválida ou expirada";

/**
 * Rotação com detecção de reuso: se o token apresentado já tiver sido
 * substituído ou revogado (`isReused()`), é tratado como sinal de roubo —
 * a sessão inteira é revogada, não só rejeitada. Ver ADR 0010.
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly userRepository: IUserRepository,
    private readonly auditLogRepository: IAuditLogRepository,
    private readonly tokenProvider: ITokenProvider,
    private readonly tokenHasher: ITokenHasher,
    private readonly idGenerator: IIdGenerator,
    private readonly clock: IClock,
    private readonly config: IdentityModuleConfig,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const now = this.clock.now();
    const incomingHash = this.tokenHasher.hash(input.refreshToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(incomingHash);

    if (!session) {
      await this.appendAudit(null, "REFRESH_TOKEN_INVALID", "FAILURE", input);
      throw new AppError("UNAUTHORIZED", GENERIC_REFRESH_ERROR_MESSAGE);
    }

    // `matchedToken` é o token que bateu o hash pesquisado — pode ser o
    // atual ou um já rotacionado (é exatamente esse segundo caso que
    // configura reuso).
    const matchedToken = session.currentRefreshToken;

    if (matchedToken.isReused()) {
      session.revoke(now);
      await this.sessionRepository.save(session);
      await this.appendAudit(session.userId, "REFRESH_TOKEN_REUSE_DETECTED", "FAILURE", input, {
        sessionId: session.id,
      });
      throw new AppError("UNAUTHORIZED", GENERIC_REFRESH_ERROR_MESSAGE);
    }

    if (matchedToken.isExpired(now) || !session.isActive(now)) {
      await this.appendAudit(session.userId, "REFRESH_TOKEN_INVALID", "FAILURE", input, {
        sessionId: session.id,
      });
      throw new AppError("UNAUTHORIZED", GENERIC_REFRESH_ERROR_MESSAGE);
    }

    const user = await this.userRepository.findById(session.userId);
    if (!user || !user.canAuthenticate(now)) {
      await this.appendAudit(session.userId, "REFRESH_TOKEN_INVALID", "FAILURE", input, {
        sessionId: session.id,
      });
      throw new AppError("UNAUTHORIZED", GENERIC_REFRESH_ERROR_MESSAGE);
    }

    const newRawToken = this.idGenerator.generateSecureToken();
    const newRefreshToken = RefreshToken.create({
      id: this.idGenerator.generateId(),
      sessionId: session.id,
      tokenHash: this.tokenHasher.hash(newRawToken),
      familyId: matchedToken.familyId,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + this.config.refreshTokenTtlSeconds * 1000),
      revokedAt: null,
      replacedByTokenId: null,
    });

    session.rotateRefreshToken(newRefreshToken, now);
    await this.sessionRepository.save(session);

    const accessToken = this.tokenProvider.signAccessToken(
      { sub: user.id, sid: session.id, roles: user.roles },
      this.config.accessTokenTtlSeconds,
    );

    await this.appendAudit(user.id, "TOKEN_REFRESHED", "SUCCESS", input, { sessionId: session.id });

    return { accessToken, refreshToken: newRawToken };
  }

  private async appendAudit(
    actorUserId: string | null,
    eventType: AuditEventType,
    outcome: "SUCCESS" | "FAILURE",
    input: { ipAddress: string | null; userAgent: string | null },
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    const entry = AuditLogEntry.create({
      id: this.idGenerator.generateId(),
      occurredAt: this.clock.now(),
      actorUserId,
      eventType,
      outcome,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata,
    });
    await this.auditLogRepository.append(entry);
  }
}
