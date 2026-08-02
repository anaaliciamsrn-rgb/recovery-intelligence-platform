import type {
  PrismaClient,
  RefreshToken as PrismaRefreshTokenRecord,
  Session as PrismaSessionRecord,
} from "@prisma/client";
import { RefreshToken } from "../../domain/entities/RefreshToken.js";
import { Session, type SessionStatus } from "../../domain/entities/Session.js";
import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";

export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Session | null> {
    const sessionRecord = await this.prisma.session.findUnique({ where: { id } });
    if (!sessionRecord) return null;

    const tokenRecord = await this.currentTokenRecord(id);
    if (!tokenRecord) return null;

    return this.toDomain(sessionRecord, tokenRecord);
  }

  /**
   * `tokenRecord` pode ser o token atual OU um já substituído — é
   * exatamente esse segundo caso que permite ao use case detectar reuso
   * (ver RefreshTokenUseCase e ADR 0010).
   */
  async findByRefreshTokenHash(tokenHash: string): Promise<Session | null> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!tokenRecord) return null;

    const sessionRecord = await this.prisma.session.findUnique({
      where: { id: tokenRecord.sessionId },
    });
    if (!sessionRecord) return null;

    return this.toDomain(sessionRecord, tokenRecord);
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const sessionRecords = await this.prisma.session.findMany({
      where: { userId, status: "ACTIVE", expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: "desc" },
    });

    const sessions = await Promise.all(
      sessionRecords.map(async (sessionRecord) => {
        const tokenRecord = await this.currentTokenRecord(sessionRecord.id);
        return tokenRecord ? this.toDomain(sessionRecord, tokenRecord) : null;
      }),
    );

    return sessions.filter((session): session is Session => session !== null);
  }

  async save(session: Session): Promise<void> {
    const props = session.toProps();

    await this.prisma.session.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        userId: props.userId,
        status: props.status,
        userAgent: props.userAgent,
        ipAddress: props.ipAddress,
        createdAt: props.createdAt,
        lastUsedAt: props.lastUsedAt,
        expiresAt: props.expiresAt,
      },
      update: {
        status: props.status,
        lastUsedAt: props.lastUsedAt,
        expiresAt: props.expiresAt,
      },
    });

    for (const token of session.pullTouchedRefreshTokens()) {
      const tokenProps = token.toProps();
      await this.prisma.refreshToken.upsert({
        where: { id: tokenProps.id },
        create: {
          id: tokenProps.id,
          sessionId: tokenProps.sessionId,
          tokenHash: tokenProps.tokenHash,
          familyId: tokenProps.familyId,
          issuedAt: tokenProps.issuedAt,
          expiresAt: tokenProps.expiresAt,
          revokedAt: tokenProps.revokedAt,
          replacedByTokenId: tokenProps.replacedByTokenId,
        },
        update: {
          revokedAt: tokenProps.revokedAt,
          replacedByTokenId: tokenProps.replacedByTokenId,
        },
      });
    }

    // Rede de segurança: se a sessão foi revogada (logout, revoke, ou reuso
    // detectado) mas o token carregado em memória não era necessariamente o
    // atual de verdade (caso do reuso), garante que NENHUM token da sessão
    // fica sem `revokedAt` — sem isso, um token válido não visto por esta
    // operação continuaria aceitável em um refresh futuro.
    if (props.status === "REVOKED") {
      await this.prisma.refreshToken.updateMany({
        where: { sessionId: props.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  private async currentTokenRecord(sessionId: string): Promise<PrismaRefreshTokenRecord | null> {
    return this.prisma.refreshToken.findFirst({
      where: { sessionId, replacedByTokenId: null },
      orderBy: { issuedAt: "desc" },
    });
  }

  private toDomain(
    sessionRecord: PrismaSessionRecord,
    tokenRecord: PrismaRefreshTokenRecord,
  ): Session {
    const refreshToken = RefreshToken.create({
      id: tokenRecord.id,
      sessionId: tokenRecord.sessionId,
      tokenHash: tokenRecord.tokenHash,
      familyId: tokenRecord.familyId,
      issuedAt: tokenRecord.issuedAt,
      expiresAt: tokenRecord.expiresAt,
      revokedAt: tokenRecord.revokedAt,
      replacedByTokenId: tokenRecord.replacedByTokenId,
    });

    return Session.create({
      id: sessionRecord.id,
      userId: sessionRecord.userId,
      status: sessionRecord.status as SessionStatus,
      userAgent: sessionRecord.userAgent,
      ipAddress: sessionRecord.ipAddress,
      createdAt: sessionRecord.createdAt,
      lastUsedAt: sessionRecord.lastUsedAt,
      expiresAt: sessionRecord.expiresAt,
      currentRefreshToken: refreshToken,
    });
  }
}
