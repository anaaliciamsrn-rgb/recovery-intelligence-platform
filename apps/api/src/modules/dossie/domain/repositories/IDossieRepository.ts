import type { Dossie } from "../entities/Dossie.js";
import type { DossieSubjectType } from "../value-objects/DossieSubjectType.js";

export interface IDossieRepository {
  findById(id: string): Promise<Dossie | null>;
  /** Usado pela busca de identidade (ADR 0037) para saber se um sujeito já tem Dossiê — `null` quando ainda não foi importado/analisado. */
  findBySubject(subjectType: DossieSubjectType, subjectId: string): Promise<Dossie | null>;
  /** Usado por `analytics` (ADR 0037) para agregar totais de um conjunto de Dossiês já filtrado por tenant — nunca a base para o filtro em si. */
  findManyByIds(ids: string[]): Promise<Dossie[]>;
  save(dossie: Dossie): Promise<void>;
  /** Usado só por `ResetTenantImportedDataUseCase` (ADR 0037) para desfazer uma importação de demonstração antes de uma apresentação. */
  deleteMany(ids: string[]): Promise<void>;
}
