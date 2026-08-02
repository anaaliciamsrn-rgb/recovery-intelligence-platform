import type { Dossie } from "../../../dossie/domain/entities/Dossie.js";
import type { IDossieRepository } from "../../../dossie/domain/repositories/IDossieRepository.js";

/**
 * Port para a fábrica do adapter em memória (ver `InMemoryDossieRepository`,
 * infrastructure) — a application layer não pode importar infrastructure
 * diretamente (ADR 0009); esta é a abstração que permite ao use case pedir
 * "um repositório só para este Dossiê hipotético" sem conhecer a
 * implementação concreta. Ver ADR 0023.
 */
export interface IInMemoryDossieRepositoryFactory {
  create(dossie: Dossie): IDossieRepository;
}
