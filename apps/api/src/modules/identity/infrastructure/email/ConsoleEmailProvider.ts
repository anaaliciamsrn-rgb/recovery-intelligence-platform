import type { ILogger } from "../../../../application/ports/ILogger.js";
import type { IEmailProvider } from "../../application/ports/IEmailProvider.js";

/**
 * Implementação padrão sem nenhuma configuração externa — imprime o link
 * completo no log em vez de enviar de fato. Existe para demonstração e
 * desenvolvimento local sem precisar de um servidor SMTP real; nunca finge
 * ter enviado algo que não foi enviado (é explícito nos próprios logs que
 * este é o provider de console). Escolhido pelo container quando
 * `SMTP_HOST` não está configurado — ver `identity/container.ts`.
 */
export class ConsoleEmailProvider implements IEmailProvider {
  constructor(private readonly logger: ILogger) {}

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    this.logger.info("password_reset_email_console", { to, resetLink });
    console.log(
      `\n[ConsoleEmailProvider] Link de redefinição de senha para ${to}:\n${resetLink}\n`,
    );
  }
}
