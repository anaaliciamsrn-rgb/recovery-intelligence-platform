/**
 * Base para erros de violação de invariantes de negócio.
 * Domain não conhece HTTP — o mapeamento para status code acontece em presentation/application.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
