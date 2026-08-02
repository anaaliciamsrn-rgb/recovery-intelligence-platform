/**
 * Config concreta que os use cases do módulo recebem — nunca `Env` (a regra
 * de boundaries não permite `application` importar `shared`; o container
 * do módulo é quem extrai esses valores de `env` e monta este objeto).
 */
export interface IdentityModuleConfig {
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  accountLockoutThreshold: number;
  accountLockoutDurationSeconds: number;
}
