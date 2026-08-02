import type { TenantResourceOwnership } from "../entities/TenantResourceOwnership.js";

/**
 * Decide se um tenant pode acessar um recurso — puro, sem I/O. Fail-closed
 * por design: um recurso sem nenhum registro de propriedade nunca é
 * acessível por nenhum tenant (nunca assume "sem dono = livre para todos").
 * Ver ADR 0028.
 */
export class TenantPolicy {
  static podeAcessar(ownership: TenantResourceOwnership | null, tenantId: string): boolean {
    return ownership !== null && ownership.tenantId === tenantId;
  }
}
