/**
 * Porta de envio de e-mail — específica do módulo (não do shared kernel,
 * já que só `identity` precisa disso nesta fase). `ConsoleEmailProvider`
 * (sempre disponível, zero config) e `SMTPEmailProvider` (via `nodemailer`,
 * só ativo quando `SMTP_HOST` está configurado) implementam esta porta —
 * ver container.ts para a escolha em runtime.
 */
export interface IEmailProvider {
  sendPasswordResetEmail(to: string, resetLink: string): Promise<void>;
}
