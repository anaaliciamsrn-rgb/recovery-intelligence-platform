export interface LoginAttemptState {
  isBlocked: boolean;
  failureCount: number;
}

/**
 * Conta só falhas (não todo request — isso é papel do rate limit de rota),
 * por identificador (email normalizado OU IP — chaves separadas, ver
 * LoginUseCase). Backing real: Redis, com TTL próprio por chave.
 */
export interface ILoginAttemptTracker {
  recordFailure(identifier: string): Promise<LoginAttemptState>;
  recordSuccess(identifier: string): Promise<void>;
  getState(identifier: string): Promise<LoginAttemptState>;
}
