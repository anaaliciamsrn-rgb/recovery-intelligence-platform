export interface TenantResourceOwnershipProps {
  id: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  createdAt: Date;
}

/**
 * Registro de propriedade de um recurso de qualquer módulo por um tenant —
 * nunca modela o recurso em si (sem `@relation` para a tabela de origem no
 * Prisma). A garantia real de isolamento é a constraint `@@unique` no
 * banco, não este objeto. Ver ADR 0028.
 */
export class TenantResourceOwnership {
  private constructor(private readonly props: TenantResourceOwnershipProps) {}

  static create(props: TenantResourceOwnershipProps): TenantResourceOwnership {
    return new TenantResourceOwnership(props);
  }

  get id(): string {
    return this.props.id;
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get resourceType(): string {
    return this.props.resourceType;
  }

  get resourceId(): string {
    return this.props.resourceId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toProps(): Readonly<TenantResourceOwnershipProps> {
    return { ...this.props };
  }
}
