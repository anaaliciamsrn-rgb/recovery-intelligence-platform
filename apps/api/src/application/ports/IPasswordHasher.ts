/**
 * Porta reservada para a futura feature de autenticação (ver docs/architecture/decisions/0007).
 * Sem implementação nesta sprint: ainda não existe entidade de usuário no domínio.
 */
export interface IPasswordHasher {
  hash(plainText: string): Promise<string>;
  verify(plainText: string, hash: string): Promise<boolean>;
}
