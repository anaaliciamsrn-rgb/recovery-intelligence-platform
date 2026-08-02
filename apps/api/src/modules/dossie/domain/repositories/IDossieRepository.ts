import type { Dossie } from "../entities/Dossie.js";

export interface IDossieRepository {
  findById(id: string): Promise<Dossie | null>;
  save(dossie: Dossie): Promise<void>;
}
