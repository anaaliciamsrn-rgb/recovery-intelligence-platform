import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";

export interface UserSummary {
  id: string;
  email: string;
  nome: string | null;
  sobrenome: string | null;
  empresa: string | null;
  cargo: string | null;
  roles: string[];
  accountStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Tela de gestão de usuários (admin) — quem se cadastrou sozinho aparece aqui com o papel `VIEWER`, sem nenhuma permissão, até um admin atribuir um papel real. */
export class ListUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(): Promise<UserSummary[]> {
    const users = await this.userRepository.findAll();

    return users.map((user) => ({
      id: user.id,
      email: user.email.toString(),
      nome: user.nome,
      sobrenome: user.sobrenome,
      empresa: user.empresa,
      cargo: user.cargo,
      roles: user.roles,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    }));
  }
}
