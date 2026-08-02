import { AppError } from "../../../../application/errors/AppError.js";
import { RolePermissionPolicy } from "../../domain/services/RolePermissionPolicy.js";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";

export interface GetCurrentUserOutput {
  id: string;
  email: string;
  roles: string[];
  /** Adicionado na fase de polimento UX/UI — permite o frontend decidir o que mostrar/esconder sem precisar de uma segunda chamada. */
  permissions: string[];
  nome: string | null;
  sobrenome: string | null;
  empresa: string | null;
  cargo: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/**
 * "Quem sou eu" — o frontend chama isto ao recarregar a página (depois de
 * `POST /auth/refresh`, que só devolve `accessToken`, nunca o perfil) para
 * reidratar a sessão sem exigir novo login. Nenhum dado sensível: mesmo
 * formato já devolvido por `LoginUseCase`, estendido (aditivo) com o perfil
 * usado pela tela "Minha Conta".
 */
export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userId: string): Promise<GetCurrentUserOutput> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("UNAUTHORIZED", "Usuário não encontrado");
    }

    return {
      id: user.id,
      email: user.email.toString(),
      roles: user.roles,
      permissions: [...RolePermissionPolicy.resolvePermissions(user.roles)],
      nome: user.nome,
      sobrenome: user.sobrenome,
      empresa: user.empresa,
      cargo: user.cargo,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }
}
