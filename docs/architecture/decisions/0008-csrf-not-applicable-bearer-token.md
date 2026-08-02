# 0008 — CSRF não se aplica ao modelo atual (Bearer token)

## Status

Superseded parcialmente pelo [ADR 0010](0010-identity-module-architecture.md) — o gatilho previsto abaixo ("se o refresh token for armazenado em cookie") aconteceu. Mantido como registro histórico da decisão original; a postura de CSRF atual está descrita no ADR 0010.

## Contexto

CSRF explora o fato de o navegador enviar cookies automaticamente em requisições cross-site. É uma preocupação real para APIs autenticadas via cookie de sessão.

## Decisão

A estratégia de autenticação planejada ([0007](0007-auth-strategy-scaffolded.md)) usa JWT enviado no header `Authorization: Bearer`, não em cookie. Um navegador não anexa esse header automaticamente em uma requisição forjada por outro site — o frontend precisa ler o token (ex.: de memória/`localStorage`) e setá-lo explicitamente. Isso remove o vetor clássico de CSRF. Por isso, nenhuma proteção CSRF (ex.: double-submit token) é implementada nesta sprint.

## Consequências

- Se o refresh token futuramente for armazenado em cookie `httpOnly` (mais seguro contra XSS do que `localStorage`), este ADR precisa ser revisado e uma proteção CSRF (ex.: `csurf`/double-submit cookie) precisa ser adicionada antes de esse endpoint entrar em produção.
- Helmet já está configurado (`security-headers.middleware.ts`) com `crossOriginResourcePolicy`, mitigando outras classes de ataque cross-site independentemente desta decisão.

## Atualização

O gatilho acima se concretizou: o refresh token do módulo `identity` vai em cookie `httpOnly`. A proteção CSRF adotada foi `SameSite=Strict` no cookie (em vez de double-submit token) — ver [ADR 0010](0010-identity-module-architecture.md) para o raciocínio completo. O access token continua Bearer puro, sem cookie.
