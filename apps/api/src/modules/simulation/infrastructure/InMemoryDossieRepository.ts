import type { Dossie } from "../../dossie/domain/entities/Dossie.js";
import type { IDossieRepository } from "../../dossie/domain/repositories/IDossieRepository.js";
import type { IInMemoryDossieRepositoryFactory } from "../application/ports/IInMemoryDossieRepositoryFactory.js";

/**
 * Adapter que implementa `IDossieRepository` (dossie, ADR 0015) sobre um
 * único Dossiê hipotético mantido em memória — permite reaproveitar
 * `ClassificarDossieUseCase` sem modificação nenhuma (mesmas regras, mesma
 * lógica), sem nunca tocar o banco. `save()` é um no-op deliberado: a
 * simulação nunca persiste nada, nem por acidente. Ver ADR 0023.
 */
export class InMemoryDossieRepository implements IDossieRepository {
  constructor(private readonly dossie: Dossie) {}

  async findById(id: string): Promise<Dossie | null> {
    return this.dossie.id === id ? this.dossie : null;
  }

  async save(): Promise<void> {
    // Intencionalmente vazio — ver o comentário da classe.
  }
}

export class InMemoryDossieRepositoryFactory implements IInMemoryDossieRepositoryFactory {
  create(dossie: Dossie): IDossieRepository {
    return new InMemoryDossieRepository(dossie);
  }
}
