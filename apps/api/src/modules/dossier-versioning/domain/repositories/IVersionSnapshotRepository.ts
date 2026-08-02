import type { VersionSnapshot } from "../entities/VersionSnapshot.js";

/** Só `save` do lado de escrita — append-only, mesmo espírito de `IAuditEventRepository`/`AuditLogEntry.append`. */
export interface IVersionSnapshotRepository {
  save(snapshot: VersionSnapshot): Promise<void>;
  /** `null` quando o dossiê ainda não tem nenhuma versão — a próxima a criar é a 1. */
  findLatestVersionNumber(dossieId: string): Promise<number | null>;
  /** Ordenado por `versao` ascendente. */
  findByDossieId(dossieId: string): Promise<VersionSnapshot[]>;
  findByDossieIdAndVersion(dossieId: string, versao: number): Promise<VersionSnapshot | null>;
  /** A versão mais recente de cada Dossiê que já teve pelo menos uma versão — usado por `analytics` (ADR 0025) para KPIs agregados. */
  findLatestPerDossie(): Promise<VersionSnapshot[]>;
  /** Todas as versões de todos os Dossiês — usado por `analytics` para evolução temporal. Não escala para volume real (ver ADR 0025), mesma ressalva já registrada para `findAll()` em `party` (ADR 0019). */
  findAll(): Promise<VersionSnapshot[]>;
}
