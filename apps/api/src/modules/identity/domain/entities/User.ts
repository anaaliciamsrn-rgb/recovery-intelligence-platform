import { RolePermissionPolicy } from "../services/RolePermissionPolicy.js";
import { AccountStatus } from "../value-objects/AccountStatus.js";
import type { Email } from "../value-objects/Email.js";
import type { PasswordHash } from "../value-objects/PasswordHash.js";
import type { Permission } from "../value-objects/Permission.js";
import type { Role } from "../value-objects/Role.js";

/**
 * Todos os campos opcionais aqui de propósito: `create()` normaliza ausência
 * para `null` — nenhum dos ~15 pontos existentes que já chamam `User.create`
 * (testes, `PrismaUserRepository`, seed) precisou mudar quando este perfil
 * foi adicionado nesta fase de polimento.
 */
export interface UserProfile {
  nome?: string | null | undefined;
  sobrenome?: string | null | undefined;
  empresa?: string | null | undefined;
  cargo?: string | null | undefined;
  avatarUrl?: string | null | undefined;
}

export interface UserProps extends UserProfile {
  id: string;
  email: Email;
  passwordHash: PasswordHash;
  roles: Role[];
  accountStatus: AccountStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  mfaEnabled: boolean;
  /** Distinto de `updatedAt` — só é tocado por `recordSuccessfulLogin`, nunca por uma edição de perfil. Opcional pelo mesmo motivo do UserProfile. */
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ator que autentica na plataforma (ex.: analista de uma empresa cliente).
 * Não confundir com Pessoa/Empresa (o sujeito consultado — bounded context
 * futuro, sem relação com este). Modelo rico: as regras de negócio vivem
 * como métodos aqui, não espalhadas em use cases.
 */
export class User {
  private constructor(private props: UserProps) {}

  static create(props: UserProps): User {
    return new User({
      ...props,
      nome: props.nome ?? null,
      sobrenome: props.sobrenome ?? null,
      empresa: props.empresa ?? null,
      cargo: props.cargo ?? null,
      avatarUrl: props.avatarUrl ?? null,
      lastLoginAt: props.lastLoginAt ?? null,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }

  get roles(): Role[] {
    return [...this.props.roles];
  }

  get accountStatus(): AccountStatus {
    return this.props.accountStatus;
  }

  get mfaEnabled(): boolean {
    return this.props.mfaEnabled;
  }

  get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  get nome(): string | null {
    return this.props.nome ?? null;
  }

  get sobrenome(): string | null {
    return this.props.sobrenome ?? null;
  }

  get empresa(): string | null {
    return this.props.empresa ?? null;
  }

  get cargo(): string | null {
    return this.props.cargo ?? null;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl ?? null;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt ?? null;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /**
   * `LOCKED` com `lockedUntil` já no passado é tratado como "pode tentar de
   * novo" — o autodesbloqueio persistido só acontece explicitamente em
   * `recordSuccessfulLogin`, para não haver mutação silenciosa numa leitura.
   */
  canAuthenticate(now: Date): boolean {
    if (this.props.accountStatus === AccountStatus.DISABLED) {
      return false;
    }

    if (this.props.accountStatus === AccountStatus.LOCKED) {
      return this.props.lockedUntil !== null && this.props.lockedUntil <= now;
    }

    return true;
  }

  hasPermission(permission: Permission): boolean {
    return RolePermissionPolicy.hasPermission(this.props.roles, permission);
  }

  /**
   * Se cruzar o limiar, tranca a conta. Note que continuar falhando após o
   * lock expirar reconta a partir do valor já acumulado (não zera ao
   * expirar) — resultado prático: quem continua martelando senha errada
   * fica trancado de novo imediatamente, o que é o comportamento desejado.
   */
  recordFailedLogin(now: Date, lockoutThreshold: number, lockoutDurationSeconds: number): void {
    this.props.failedLoginAttempts += 1;

    if (this.props.failedLoginAttempts >= lockoutThreshold) {
      this.props.accountStatus = AccountStatus.LOCKED;
      this.props.lockedUntil = new Date(now.getTime() + lockoutDurationSeconds * 1000);
    }

    this.props.updatedAt = now;
  }

  recordSuccessfulLogin(now: Date): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;

    if (this.props.accountStatus === AccountStatus.LOCKED) {
      this.props.accountStatus = AccountStatus.ACTIVE;
    }

    this.props.lastLoginAt = now;
    this.props.updatedAt = now;
  }

  changePassword(newHash: PasswordHash, now: Date): void {
    this.props.passwordHash = newHash;
    this.props.updatedAt = now;
  }

  /** Só o fluxo de gestão de usuários (`AssignUserRolesUseCase`) chama isto — nunca `updateProfile`, que deliberadamente não toca papéis. */
  assignRoles(roles: Role[], now: Date): void {
    this.props.roles = [...roles];
    this.props.updatedAt = now;
  }

  /** Edição de "Minha Conta" — nunca toca email/senha/papéis/status (cada um tem seu próprio fluxo dedicado, com sua própria auditoria). */
  updateProfile(profile: UserProfile, now: Date): void {
    if (profile.nome !== undefined) this.props.nome = profile.nome;
    if (profile.sobrenome !== undefined) this.props.sobrenome = profile.sobrenome;
    if (profile.empresa !== undefined) this.props.empresa = profile.empresa;
    if (profile.cargo !== undefined) this.props.cargo = profile.cargo;
    if (profile.avatarUrl !== undefined) this.props.avatarUrl = profile.avatarUrl;
    this.props.updatedAt = now;
  }

  toProps(): Readonly<UserProps> {
    return { ...this.props };
  }
}
