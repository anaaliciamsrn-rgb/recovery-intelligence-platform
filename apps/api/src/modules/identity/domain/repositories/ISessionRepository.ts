import type { Session } from "../entities/Session.js";

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  /** Sempre devolve o agregado `Session` completo — nunca um RefreshToken isolado. */
  findByRefreshTokenHash(tokenHash: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  save(session: Session): Promise<void>;
}
