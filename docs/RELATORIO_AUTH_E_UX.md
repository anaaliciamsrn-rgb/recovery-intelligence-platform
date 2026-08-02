# Relatório — Autenticação Enterprise + Polimento UX/UI

**Data:** 2026-08-02
**Escopo:** (1) Auditoria e extensão real do módulo `identity` — cadastro, recuperação de senha, perfil, OAuth; (2) Polimento de UX/UI de toda a plataforma — landing page, microinterações, animações, navegação, acessibilidade, performance.
**Restrição respeitada:** nenhum módulo novo criado, nenhuma API existente alterada de forma incompatível, nenhum teste quebrado, tudo aditivo sobre a arquitetura Clean Architecture / DDD já aprovada.

---

## 1. Auditoria do módulo `identity` (antes de qualquer código)

Antes de implementar, o módulo foi lido por completo. Já existiam, prontos e testados: `LoginUseCase`, `RefreshTokenUseCase`, `LogoutUseCase`, `LogoutAllSessionsUseCase`, `RevokeSessionUseCase`, `ListActiveSessionsUseCase`, `GetCurrentUserUseCase`, RBAC (`Role`/`Permission`/`RolePermissionPolicy`), rate limiting em duas camadas, account lockout, JWT + refresh token opaco com rotação e detecção de reuso, auditoria própria (`AuditLogEntry`/`IAuditLogRepository`), `Argon2PasswordHasher` (shared kernel), `PlainPassword` (política de senha ≥12 caracteres, NIST 800-63B).

**Não existiam** (confirmado por grep no domínio/aplicação/rotas antes de escrever qualquer linha): cadastro (`register`), recuperação de senha, edição de perfil, campos de perfil no `User` (nome/empresa/cargo/avatar), envio de e-mail, OAuth. Essa lista definiu exatamente o que esta etapa deveria adicionar — nada além disso, e nada do que já existia foi reescrito.

## 2. Arquitetura das adições

Todas as adições seguem exatamente o padrão já estabelecido no módulo: `domain → application → infrastructure → presentation`, mais o `container.ts` como composition root. Nenhuma peça nova vive fora dessa estrutura.

- **Domain**: `User` ganhou campos de perfil opcionais (`nome`, `sobrenome`, `empresa`, `cargo`, `avatarUrl`, `lastLoginAt`) e o método `updateProfile()` — aditivo por construção (todos os campos são opcionais no tipo `UserProps`, `create()` normaliza ausência para `null`; nenhum dos pontos existentes que já chamavam `User.create()` precisou mudar). Nova entidade `PasswordResetToken` (mesmo padrão do `RefreshToken`: token opaco, hash SHA-256, uso único). `AuditEventType` ganhou 8 novos valores (`REGISTER_SUCCESS`, `PASSWORD_RESET_REQUESTED`, `PROFILE_UPDATED`, `OAUTH_LOGIN_SUCCESS`, etc.).
- **Application**: 6 use cases novos (`RegisterUseCase`, `RequestPasswordResetUseCase`, `ResetPasswordUseCase`, `UpdateProfileUseCase`, `ChangePasswordUseCase`, `OAuthLoginUseCase`) e 3 ports novos (`IEmailProvider`, `IOAuthProvider`, `IPasswordResetTokenRepository`).
- **Infrastructure**: `PrismaPasswordResetTokenRepository`, `ConsoleEmailProvider`, `SMTPEmailProvider` (via `nodemailer`), `GoogleOAuthProvider`, `MicrosoftOAuthProvider` (fluxo Authorization Code real, chamadas HTTP reais aos endpoints do Google/Microsoft — nenhuma simulação).
- **Presentation**: `ProfileController`, `OAuthController` novos; `AuthController` estendido com `register`/`requestPasswordReset`/`resetPassword`.

### Correção de fronteira arquitetural

`metricsMiddleware`/`createMetricsRouter`/`app.ts` originalmente importavam `PrometheusMetricsProvider` (infrastructure) diretamente em presentation — violação do `eslint-plugin-boundaries`. Corrigido introduzindo `IMetricsProvider` em `application/ports/`, seguindo o mesmo padrão já usado por `ILogger`.

## 3. Endpoints adicionados (todos sob `/api/v1/auth`)

| Método | Rota                         | Autenticação                      | Descrição                                                                                                                 |
| ------ | ---------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/register`                  | Pública (rate-limited)            | Cadastro real, persiste no Postgres                                                                                       |
| POST   | `/forgot-password`           | Pública (rate-limited)            | Sempre 200 genérico — nunca revela se o e-mail existe                                                                     |
| POST   | `/reset-password`            | Pública (rate-limited)            | Consome o token, revoga todas as sessões ativas do usuário                                                                |
| PATCH  | `/me/profile`                | Autenticada                       | Edita nome/sobrenome/empresa/cargo/avatar                                                                                 |
| POST   | `/me/change-password`        | Autenticada                       | Exige a senha atual                                                                                                       |
| GET    | `/oauth/providers`           | Pública                           | `{ google: boolean, microsoft: boolean }` — fonte de verdade para o frontend decidir se mostra o botão real ou "em breve" |
| GET    | `/oauth/:provider/authorize` | Pública (só ativa se configurado) | Redireciona ao provedor com `state` anti-CSRF em cookie httpOnly                                                          |
| GET    | `/oauth/:provider/callback`  | Pública (só ativa se configurado) | Troca `code` por perfil, provisiona/loga o usuário, redireciona para `/app`                                               |

`POST /auth/login` ganhou o campo opcional `rememberMe` (default `true`, mesmo comportamento anterior quando omitido) — `false` faz o cookie de refresh nascer como cookie de sessão (apagado ao fechar o navegador) em vez de persistir pelos 30 dias completos. É uma feature real, não um checkbox decorativo.

## 4. Migration

`20260802120000_extend_identity_profile_and_password_reset`: adiciona 6 colunas opcionais a `users` (`nome`, `sobrenome`, `empresa`, `cargo`, `avatar_url`, `last_login_at`) e cria a tabela `password_reset_tokens` (id, user_id, token_hash único, expires_at, used_at, created_at, FK cascade para `users`). Nenhuma coluna obrigatória sem default — nenhum dado existente é invalidado.

## 5. Fluxo completo de autenticação (ponta a ponta, real)

1. **Cadastro**: `RegisterPage` → `POST /auth/register` → `RegisterUseCase` valida unicidade de e-mail (revelada ao chamador — diferente do login, é o padrão de mercado para cadastro), aplica a política de senha (`PlainPassword`), hash Argon2id, persiste `User` real com papel `VIEWER`, audita `REGISTER_SUCCESS`. Não emite tokens — a UX escolhida foi redirecionar ao login (o endpoint de cadastro não define sessão automaticamente, decisão deliberada de manter o cadastro e a autenticação como dois fluxos distintos e auditáveis separadamente).
2. **Login**: inalterado no núcleo, só ganhou `rememberMe`. Sessão + tokens exatamente como antes (JWT de acesso + refresh opaco em cookie httpOnly).
3. **Esqueci minha senha**: `ForgotPasswordPage` → `POST /auth/forgot-password` → `RequestPasswordResetUseCase` gera token opaco, persiste hash, monta o link (`APP_URL/redefinir-senha?token=...`), chama `IEmailProvider.sendPasswordResetEmail()`. Sem `SMTP_HOST` configurado, `ConsoleEmailProvider` imprime o link completo no terminal — funcional para demonstração, nunca finge enviar algo que não foi enviado.
4. **Redefinição**: `ResetPasswordPage` → `POST /auth/reset-password` → `ResetPasswordUseCase` valida o token (hash, expiração, uso único), troca a senha, marca o token como usado e **revoga todas as sessões ativas do usuário** — uma senha comprometida o suficiente para justificar reset também justifica encerrar qualquer sessão aberta com a senha antiga.
5. **Perfil**: `ProfilePage` lê `/auth/me` (estendido nesta fase com permissões, nome, datas) e escreve via `PATCH /me/profile` e `POST /me/change-password`.
6. **OAuth**: `LoginPage` consulta `GET /auth/oauth/providers` e só renderiza o botão real do Google/Microsoft quando configurado — caso contrário mostra "— em breve" com `title` explicando que a integração está disponível mediante configuração das credenciais. Clicar no botão real redireciona para `/authorize` → provedor → `/callback` (troca `code` por perfil real via chamada HTTP ao provedor) → cookie de sessão → redirect para `/app`, onde o `AuthProvider` já existente reidrata a sessão a partir do cookie (mesmo bootstrap usado após F5) — zero lógica nova de token no frontend para o caminho OAuth.

## 6. Decisões de segurança

- **Argon2id + SHA-256 diferenciados**: senha humana (baixa entropia) usa Argon2id (lento, deliberado); token de reset e refresh token (alta entropia, já aleatórios) usam SHA-256 (rápido) — Argon2 nesse caso seria custo de CPU sem ganho real.
- **Anti-enumeração consistente**: cadastro revela colisão de e-mail (padrão de mercado, outro modelo de ameaça), mas login e recuperação de senha nunca revelam — nem por status HTTP, nem por tempo de resposta (login já mitigava timing attack com hash-dummy; recuperação de senha responde sempre 200 e só dispara e-mail se o usuário existir).
- **Revogação de sessão no reset de senha**: novo comportamento de segurança (não existia antes desta fase) — encerra todas as sessões ativas ao redefinir a senha.
- **OAuth com `state` anti-CSRF real**: gerado por requisição, guardado em cookie httpOnly de vida curta (10 min), verificado no callback antes de qualquer troca de código — não um placeholder.
- **Nunca token na URL**: o callback OAuth nunca coloca o access token na query string (evita exposição via histórico/referrer) — usa o mesmo cookie httpOnly + bootstrap de sessão já existente.
- **Nenhuma integração fake**: Google/Microsoft só ficam ativos com `client id` + `secret` + `redirect uri` reais no ambiente; sem isso, a infraestrutura existe (ports, providers, rotas) mas fica inativa, e o frontend mostra isso com transparência ("em breve"), nunca um botão que aparenta funcionar.

## 7. Componentes React criados

`ToastContext`/`ToastProvider` (feedback global), `PasswordInput` (mostrar/ocultar + aviso de Caps Lock), `PasswordStrengthMeter`, `CountUpStat` (estatística animada), `Accordion` (FAQ), `Breadcrumb`. Páginas novas: `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `ProfilePage`, `SettingsPage` (white-label). `LoginPage` e `LandingPage` foram inteiramente reescritas. `AuthContext` ganhou `hasPermission`, `refreshUser`, `rememberMe`. `AppShell`/`Sidebar`/`Topbar` ganharam breadcrumb, menu de usuário com submenu (Minha conta/Configurações), navegação secundária, animação de transição de rota, fechamento por Esc, `aria-haspopup`/`aria-expanded`/`role="menu"`.

## 8. Performance e acessibilidade

Todas as rotas do frontend agora são `React.lazy()` + `Suspense` — cada página é seu próprio chunk (confirmado no build: de um bundle único de 673 KB antes desta fase, a aplicação agora carrega ~15 chunks de página, de 0,5 KB a 18 KB cada, além dos chunks de vendor já separados). `:focus-visible` consistente em todo componente interativo, `prefers-reduced-motion` respeitado globalmente, `aria-label`/`aria-expanded`/`role` em menus e accordion, navegação por teclado nativa (botões/links reais, nunca `div` clicável).

## 9. Evidência de execução (real, desta sessão)

```
pnpm run typecheck   → 3/3 pacotes: Done, zero erros
pnpm run lint        → eslint . — zero erros
pnpm exec jest tests/unit (apps/api) → 112 suites, 543 testes, 100% passando
pnpm run build       → shared-types + api + web, build de produção completo
```

18 testes unitários novos cobrindo `RegisterUseCase`, `RequestPasswordResetUseCase`, `ResetPasswordUseCase`, `UpdateProfileUseCase`, `ChangePasswordUseCase`, `OAuthLoginUseCase` — todos passando, seguindo exatamente o padrão de fakes já usado pelo módulo (`FakeUserRepository`, `FakeClock`, etc., mais `FakePasswordResetTokenRepository`/`FakeEmailProvider` novos).

Smoke test manual no navegador (dev server): landing page, login (com botões OAuth corretamente desabilitados/"em breve"), cadastro, recuperação de senha (link inválido tratado corretamente) — todos renderizando sem erro de console.

## 10. O que fica pendente de configuração (documentado, não escondido)

- **OAuth real**: a infraestrutura está completa (ports, providers, rotas, `state` CSRF, JIT provisioning). Falta só `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`/`REDIRECT_URI` e/ou os três equivalentes de `MICROSOFT_OAUTH_*` no ambiente — ver `.env.example`.
- **SMTP real**: `ConsoleEmailProvider` funciona para demonstração; para e-mail de fato, configurar `SMTP_HOST`/`PORT`/`USER`/`PASSWORD`/`FROM`.
- **Testes de integração** (fluxo HTTP completo com Postgres/Redis reais) não puderam ser executados nesta sessão pelo mesmo bloqueio de ambiente Docker/WSL2 já documentado no relatório de produção anterior — não é um problema do código novo.
