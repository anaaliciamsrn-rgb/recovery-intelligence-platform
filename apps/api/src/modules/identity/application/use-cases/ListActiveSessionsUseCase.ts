import type { ISessionRepository } from "../../domain/repositories/ISessionRepository.js";

export interface ActiveSessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

/** Leitura pura — "gerenciar meus dispositivos". Sem efeito colateral, sem auditoria. */
export class ListActiveSessionsUseCase {
  constructor(private readonly sessionRepository: ISessionRepository) {}

  async execute(userId: string): Promise<ActiveSessionSummary[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);

    return sessions.map((session) => {
      const props = session.toProps();
      return {
        id: props.id,
        userAgent: props.userAgent,
        ipAddress: props.ipAddress,
        createdAt: props.createdAt,
        lastUsedAt: props.lastUsedAt,
        expiresAt: props.expiresAt,
      };
    });
  }
}
