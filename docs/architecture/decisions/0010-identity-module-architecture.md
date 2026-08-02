# 0010 — Módulo de Identidade e Controle de Acesso

## Status

Aceito e implementado

## Contexto

Primeiro bounded context de negócio real da plataforma (autenticação, sessão, RBAC, auditoria). O [ADR 0007](0007-auth-strategy-scaffolded.md) já tinha anunciado a intenção (Argon2, JWT + refresh, RBAC) sem implementar nada. Este ADR registra as decisões tomadas na implementação — várias delas mais específicas do que o 0007 previa — e formaliza uma mudança em relação ao [ADR 0008](0008-csrf-not-applicable-bearer-token.md).

## Decisão

### Estrutura de pastas: módulo por bounded context

`apps/api/src/modules/identity/{domain,application,infrastructure,presentation}` — árvore própria completa, em vez de misturar entidades de Identity nas pastas `domain/`, `application/` etc. da raiz de `src/`. Essas pastas da raiz passam a representar só o shared kernel da plataforma (config, logging, observabilidade, erro/health genéricos). Próximos bounded contexts (consulta de CPF/CNPJ, score, dossiê) seguem o mesmo padrão `modules/<nome>/`.

`IPasswordHasher` e `ITokenProvider` (já existiam antes deste módulo) permanecem no shared kernel (`application/ports`, `infrastructure/security`) — hashing de senha e verificação de JWT são capacidades genéricas o suficiente para outros módulos futuros reutilizarem. Só ports específicos de Identity (`ITokenHasher`, `ILoginAttemptTracker`, `IClock`, `IIdGenerator`) vivem dentro do módulo.

### Access token (JWT) vs. refresh token (opaco) — dois hashes diferentes

Só o access token é um JWT — precisa ser auto-verificável sem round-trip ao banco. O refresh token é uma string opaca de alta entropia (256 bits, `crypto.randomBytes`): ele já exige lookup no banco a cada uso (para checar revogação/rotação), então não há ganho em ser um JWT, e um token opaco não expõe estrutura nenhuma a um atacante.

Por isso dois hashes diferentes: Argon2id (lento, de propósito) para a senha humana de baixa entropia; SHA-256 (rápido) para o refresh token, que já nasce de alta entropia — usar Argon2 aqui seria custo de CPU sem ganho de segurança real.

### Refresh token em cookie `httpOnly` — revisão do ADR 0008

O ADR 0008 previa Bearer puro (sem cookie) para toda a sessão. Na implementação, o refresh token foi movido para um cookie `httpOnly; Secure; SameSite=Strict`, escopado a `/api/v1/auth`; o access token continua no corpo JSON, guardado em memória pelo frontend, enviado via `Authorization: Bearer`.

Motivo: um cookie `httpOnly` não é legível por JavaScript, reduzindo a exposição do credential de longa duração a roubo via XSS — o access token de vida curta (15 min) já é um risco menor mesmo se exposto. `SameSite=Strict` neutraliza o vetor clássico de CSRF sem precisar de double-submit token, porque o cookie não é enviado em navegação/requisição cross-site.

**Isso supersede parcialmente o ADR 0008**, que permanece registrado como decisão histórica, com uma nota apontando para aqui.

### Rotação de refresh token com detecção de reuso

Cada refresh token tem uma linha própria na tabela (`RefreshToken`), não só "o token atual" — a cadeia via `replacedByTokenId` é o que permite detectar reuso: se um token já substituído for apresentado de novo (sinal de roubo), a sessão inteira é revogada imediatamente (`Session.revoke`), não só o refresh rejeitado. A auditoria registra o evento específico (`REFRESH_TOKEN_REUSE_DETECTED`), mas a resposta HTTP ao chamador é o mesmo 401 genérico de qualquer refresh inválido.

### Rate limiting da rota de login

Reaproveita a mesma factory `createRateLimitMiddleware` (Redis-backed) já usada para o rate limit global, com uma instância própria e limites mais estritos (`LOGIN_RATE_LIMIT_WINDOW_MS`/`LOGIN_RATE_LIMIT_MAX_REQUESTS`), montada só em `POST /auth/login`. Complementar a isso, `ILoginAttemptTracker` (Redis) conta falhas — não todo request — por email normalizado e por IP separadamente, e o bloqueio de conta persistido (`User.accountStatus = LOCKED`, ver `docs`) sobrevive a um reinício do Redis. Três camadas complementares, não redundantes: rate limit de rota (todo request), attempt tracker (só falhas, rápido, sem tocar banco), lockout persistido (durável).

### Não vazar estado de conta (anti-enumeração)

`LoginUseCase` devolve exatamente a mesma mensagem genérica ("Credenciais inválidas") para email inexistente, senha errada, conta trancada e conta desabilitada — a diferenciação (`LOGIN_FAILURE_UNKNOWN_EMAIL`, `LOGIN_FAILURE_BAD_PASSWORD`, `LOGIN_FAILURE_ACCOUNT_LOCKED`, `LOGIN_FAILURE_ACCOUNT_DISABLED`) só existe na auditoria interna, nunca na resposta HTTP. Mesmo princípio para `RefreshTokenUseCase`. Consequência prática: nenhum novo `AppErrorKind` foi necessário — tudo cabe em `UNAUTHORIZED`/`FORBIDDEN` já existentes.

### RBAC por permissão, não por nome de papel

Checagens de autorização (`authorizeMiddleware`, `RolePermissionPolicy`, `RevokeSessionUseCase`) sempre usam permissão (`identity:manage-sessions`, `identity:revoke-any-session`, `identity:view-audit-log`), nunca nome de papel diretamente. Papéis (`ADMIN`, `ANALYST`, `VIEWER`) são um enum fechado, definido em código — sem tabela própria nesta fase, porque não são gerenciáveis dinamicamente ainda (decisão YAGNI: uma tabela relacional de papéis só se justifica quando existir uma feature de gestão de papéis).

Autorização composta (dono do recurso OU permissão de admin, ex.: revogar a sessão de outra pessoa) não cabe num `authorizeMiddleware` estático de rota — por isso vive dentro do use case (`RevokeSessionUseCase`), não numa checagem de rota.

## Consequências

- Nenhuma regra de negócio de identidade vive fora de `modules/identity` — os próximos bounded contexts entram do mesmo jeito, sem disputar as pastas genéricas da raiz.
- O ADR 0008 precisa ser lido junto com este (ver nota de superseding nele).
- Se algum dia o refresh token deixar de ser opaco (ex.: passar a carregar claims), a distinção Argon2/SHA-256 e a decisão de não usar JWT para ele precisam ser revisitadas.
- MFA (`User.mfaEnabled`, sem porta de desafio implementada) e checagem de senha contra lista de vazamentos seguem como pontos de extensão preparados, não implementados — mesmo padrão que o ADR 0007 já usava para `IPasswordHasher`/`ITokenProvider`.
