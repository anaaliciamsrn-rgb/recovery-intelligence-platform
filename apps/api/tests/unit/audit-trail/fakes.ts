import type { IClock } from "../../../src/modules/audit-trail/application/ports/IClock.js";
import type { IIdGenerator } from "../../../src/modules/audit-trail/application/ports/IIdGenerator.js";
import type { AuditEvent } from "../../../src/modules/audit-trail/domain/entities/AuditEvent.js";
import type {
  AuditEventFilter,
  AuditEventPage,
  AuditEventPagination,
  IAuditEventRepository,
} from "../../../src/modules/audit-trail/domain/repositories/IAuditEventRepository.js";

export class FakeAuditEventRepository implements IAuditEventRepository {
  private readonly eventsById = new Map<string, AuditEvent>();

  async save(event: AuditEvent): Promise<void> {
    this.eventsById.set(event.id, event);
  }

  async findById(id: string): Promise<AuditEvent | null> {
    return this.eventsById.get(id) ?? null;
  }

  async findMany(
    filter: AuditEventFilter,
    pagination: AuditEventPagination,
  ): Promise<AuditEventPage> {
    const filtered = [...this.eventsById.values()].filter((event) => this.matches(event, filter));
    return this.paginate(filtered, pagination);
  }

  async findByEntity(
    entidade: string,
    entidadeId: string,
    pagination: AuditEventPagination,
  ): Promise<AuditEventPage> {
    const filtered = [...this.eventsById.values()].filter(
      (event) => event.entidade === entidade && event.entidadeId === entidadeId,
    );
    return this.paginate(filtered, pagination);
  }

  async findByUser(usuarioId: string, pagination: AuditEventPagination): Promise<AuditEventPage> {
    const filtered = [...this.eventsById.values()].filter((event) => event.usuarioId === usuarioId);
    return this.paginate(filtered, pagination);
  }

  async findByRequestId(requestId: string): Promise<AuditEvent[]> {
    return [...this.eventsById.values()].filter((event) => event.requestId === requestId);
  }

  seed(event: AuditEvent): void {
    this.eventsById.set(event.id, event);
  }

  private matches(event: AuditEvent, filter: AuditEventFilter): boolean {
    if (filter.desde && event.timestamp < filter.desde) return false;
    if (filter.ate && event.timestamp > filter.ate) return false;
    if (filter.usuarioId && event.usuarioId !== filter.usuarioId) return false;
    if (filter.tipo && event.tipo !== filter.tipo) return false;
    if (filter.entidade && event.entidade !== filter.entidade) return false;
    if (filter.outcome && event.outcome !== filter.outcome) return false;
    return true;
  }

  private paginate(events: AuditEvent[], pagination: AuditEventPagination): AuditEventPage {
    const dir = pagination.sortOrder === "asc" ? 1 : -1;
    const sorted = [...events].sort((a, b) => {
      const av = pagination.sortBy === "timestamp" ? a.timestamp.getTime() : a.duracaoMs;
      const bv = pagination.sortBy === "timestamp" ? b.timestamp.getTime() : b.duracaoMs;
      return (av - bv) * dir;
    });
    const start = (pagination.page - 1) * pagination.pageSize;
    return {
      items: sorted.slice(start, start + pagination.pageSize),
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }
}

export class FakeIdGenerator implements IIdGenerator {
  private counter = 0;

  generateId(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class FakeClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  set(date: Date): void {
    this.current = date;
  }
}
