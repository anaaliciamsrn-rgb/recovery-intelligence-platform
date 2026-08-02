/**
 * Hash rápido (SHA-256), não Argon2 — o refresh token já é um segredo de
 * alta entropia (256 bits aleatórios), diferente de uma senha humana.
 * Argon2 aqui seria custo de CPU sem ganho de segurança real (ver ADR 0010).
 */
export interface ITokenHasher {
  hash(rawToken: string): string;
}
