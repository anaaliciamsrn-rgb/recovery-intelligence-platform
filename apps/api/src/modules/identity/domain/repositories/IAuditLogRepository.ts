import type { AuditLogEntry } from "../entities/AuditLogEntry.js";

export interface IAuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
}
