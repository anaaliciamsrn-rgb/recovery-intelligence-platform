/**
 * Provedores de e-mail pessoal/gratuito conhecidos — nunca usados como chave
 * de tenant compartilhado. Duas contas distintas em `@gmail.com` não têm
 * nenhuma relação de fato; tratá-las como a mesma "empresa" só porque
 * compartilham um provedor de e-mail gratuito seria um vazamento real de
 * isolamento entre carteiras de clientes completamente não relacionadas
 * (ver ADR 0037). Lista deliberadamente pequena e óbvia — não tenta ser
 * exaustiva, só cobrir os provedores mais comuns no Brasil e globalmente.
 */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "zoho.com",
]);

/**
 * Resolve o nome candidato a tenant no autocadastro/primeiro login: o nome
 * de empresa informado, ou o domínio do e-mail se for corporativo. Um
 * domínio de provedor gratuito nunca é usado como chave compartilhada —
 * cai num tenant individual, só daquela conta (`conta-<userId>`), porque
 * não há nenhuma relação real entre contas que só coincidem de usar o mesmo
 * provedor de e-mail pessoal.
 */
export function resolveTenantCandidateName(
  empresa: string | null,
  emailAddress: string,
  userId: string,
): string {
  if (empresa && empresa.trim().length > 0) return empresa.trim();

  const domain = emailAddress.split("@")[1]?.toLowerCase() ?? "";
  if (domain.length > 0 && !FREE_EMAIL_DOMAINS.has(domain)) {
    return domain;
  }

  return `conta-${userId}`;
}
