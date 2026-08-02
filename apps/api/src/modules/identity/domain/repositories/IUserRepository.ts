import type { User } from "../entities/User.js";
import type { Email } from "../value-objects/Email.js";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  /** Só a gestão de usuários (admin) lista todos — nunca usado num fluxo por-tenant ou por-carteira, o módulo não tem esse conceito. */
  findAll(): Promise<User[]>;
  save(user: User): Promise<void>;
}
