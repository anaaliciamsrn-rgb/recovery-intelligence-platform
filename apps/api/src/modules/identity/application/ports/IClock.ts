/**
 * Desacopla lógica de expiração/lockout do `Date` global — permite testar
 * determinísticamente (fake clock) sem sleep nos testes.
 */
export interface IClock {
  now(): Date;
}
