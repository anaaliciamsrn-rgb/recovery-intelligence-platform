import nodemailer, { type Transporter } from "nodemailer";
import type { ILogger } from "../../../../application/ports/ILogger.js";
import type { IEmailProvider } from "../../application/ports/IEmailProvider.js";

export interface SMTPEmailProviderConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string | undefined;
  password?: string | undefined;
  from: string;
}

/**
 * Envio real via SMTP (`nodemailer`) — só instanciado pelo container quando
 * `SMTP_HOST` está configurado (ver `identity/container.ts`). `user`/`password`
 * ficam ausentes (`undefined`) em servidores SMTP internos sem autenticação
 * — `nodemailer` trata isso corretamente sem exigir credencial fake.
 */
export class SMTPEmailProvider implements IEmailProvider {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    config: SMTPEmailProviderConfig,
    private readonly logger: ILogger,
  ) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: "Redefinição de senha — Recovery Intelligence Platform",
      text: `Recebemos um pedido para redefinir sua senha. Acesse o link a seguir para criar uma nova senha:\n\n${resetLink}\n\nSe você não solicitou isto, ignore este e-mail — sua senha permanece inalterada.`,
      html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetLink}">Clique aqui para criar uma nova senha</a></p><p>Se você não solicitou isto, ignore este e-mail — sua senha permanece inalterada.</p>`,
    });
    this.logger.info("password_reset_email_smtp_sent", { to });
  }
}
