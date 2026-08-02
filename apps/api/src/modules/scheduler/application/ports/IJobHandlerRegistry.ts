export interface IJobHandler {
  handle(payload: Record<string, unknown>): Promise<void>;
}

/**
 * Resolve qual handler processa um job pelo `tipo` — o motor (`RunDueJobsUseCase`)
 * nunca conhece nenhum handler concreto, só este contrato. Nenhum módulo de
 * negócio registra um handler ainda (ver ADR 0032, limitação de escopo).
 */
export interface IJobHandlerRegistry {
  resolve(tipo: string): IJobHandler | null;
}
