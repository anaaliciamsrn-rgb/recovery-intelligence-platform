export interface IIdGenerator {
  /** UUID para identidade de entidade (Pessoa, Empresa). */
  generateId(): string;
}
