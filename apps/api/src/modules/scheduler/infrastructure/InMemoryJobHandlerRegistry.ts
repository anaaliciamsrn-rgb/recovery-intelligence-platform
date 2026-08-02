import type { IJobHandler, IJobHandlerRegistry } from "../application/ports/IJobHandlerRegistry.js";

/**
 * Registro em memória — vive só enquanto o processo roda, montado uma vez
 * no `container.ts`. Nenhum módulo de negócio registra um handler ainda
 * (ver ADR 0032); `register()` existe para o dia em que um módulo real
 * precisar de um job.
 */
export class InMemoryJobHandlerRegistry implements IJobHandlerRegistry {
  private readonly handlersByTipo = new Map<string, IJobHandler>();

  register(tipo: string, handler: IJobHandler): void {
    this.handlersByTipo.set(tipo, handler);
  }

  resolve(tipo: string): IJobHandler | null {
    return this.handlersByTipo.get(tipo) ?? null;
  }
}
