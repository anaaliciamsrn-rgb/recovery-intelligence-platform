/**
 * Desacopla a data de criação/atualização de agregados do `Date` global —
 * permite testar deterministicamente (fake clock) sem depender do relógio
 * real. Mesmo padrão de modules/identity/application/ports/IClock.ts.
 */
export interface IClock {
  now(): Date;
}
