import { DomainError } from "../../../../domain/errors/DomainError.js";

export class InvalidTenantError extends DomainError {}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface TenantProps {
  id: string;
  nome: string;
  slug: string;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Representa uma organização cliente da plataforma (white-label) — ver ADR 0028. */
export class Tenant {
  private constructor(private readonly props: TenantProps) {}

  static create(props: TenantProps): Tenant {
    if (props.nome.trim().length === 0) {
      throw new InvalidTenantError("Nome do tenant não pode ser vazio");
    }
    if (!SLUG_PATTERN.test(props.slug)) {
      throw new InvalidTenantError(
        `Slug inválido: "${props.slug}" — use apenas letras minúsculas, números e hífens`,
      );
    }
    return new Tenant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get nome(): string {
    return this.props.nome;
  }

  get slug(): string {
    return this.props.slug;
  }

  get ativo(): boolean {
    return this.props.ativo;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toProps(): Readonly<TenantProps> {
    return { ...this.props };
  }

  /**
   * Normaliza texto livre (nome de empresa, domínio de e-mail) num slug
   * válido para `slug` — remove acentos, minúsculas, hífens únicos. Usado
   * por `identity` no autocadastro para resolver/criar o tenant a partir do
   * campo "empresa" sem duplicar a regra de formato em outro módulo (ver
   * ADR 0037).
   */
  static slugify(input: string): string {
    const normalizado = input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalizado.length > 0 ? normalizado : "tenant";
  }
}
