import type { PrismaClient, User as PrismaUserRecord } from "@prisma/client";
import { User } from "../../domain/entities/User.js";
import type { AccountStatus } from "../../domain/value-objects/AccountStatus.js";
import { Email } from "../../domain/value-objects/Email.js";
import { PasswordHash } from "../../domain/value-objects/PasswordHash.js";
import type { Role } from "../../domain/value-objects/Role.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email: email.toString() } });
    return record ? this.toDomain(record) : null;
  }

  async findAll(): Promise<User[]> {
    const records = await this.prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return records.map((record) => this.toDomain(record));
  }

  async save(user: User): Promise<void> {
    const props = user.toProps();

    await this.prisma.user.upsert({
      where: { id: props.id },
      create: {
        id: props.id,
        email: props.email.toString(),
        passwordHash: props.passwordHash.toString(),
        roles: props.roles,
        accountStatus: props.accountStatus,
        failedLoginAttempts: props.failedLoginAttempts,
        lockedUntil: props.lockedUntil,
        mfaEnabled: props.mfaEnabled,
        nome: props.nome ?? null,
        sobrenome: props.sobrenome ?? null,
        empresa: props.empresa ?? null,
        cargo: props.cargo ?? null,
        avatarUrl: props.avatarUrl ?? null,
        lastLoginAt: props.lastLoginAt ?? null,
      },
      update: {
        email: props.email.toString(),
        passwordHash: props.passwordHash.toString(),
        roles: props.roles,
        accountStatus: props.accountStatus,
        failedLoginAttempts: props.failedLoginAttempts,
        lockedUntil: props.lockedUntil,
        mfaEnabled: props.mfaEnabled,
        nome: props.nome ?? null,
        sobrenome: props.sobrenome ?? null,
        empresa: props.empresa ?? null,
        cargo: props.cargo ?? null,
        avatarUrl: props.avatarUrl ?? null,
        lastLoginAt: props.lastLoginAt ?? null,
      },
    });
  }

  /** `accountStatus`/`roles` cruzam de tipo gerado pelo Prisma para o tipo do domínio aqui — o único ponto onde isso acontece. */
  private toDomain(record: PrismaUserRecord): User {
    return User.create({
      id: record.id,
      email: Email.create(record.email),
      passwordHash: PasswordHash.fromHash(record.passwordHash),
      roles: record.roles as Role[],
      accountStatus: record.accountStatus as AccountStatus,
      failedLoginAttempts: record.failedLoginAttempts,
      lockedUntil: record.lockedUntil,
      mfaEnabled: record.mfaEnabled,
      nome: record.nome,
      sobrenome: record.sobrenome,
      empresa: record.empresa,
      cargo: record.cargo,
      avatarUrl: record.avatarUrl,
      lastLoginAt: record.lastLoginAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
