# 0007 — Estratégia de autenticação: decisão de design, implementação futura

## Status

Implementado — ver [ADR 0010](0010-identity-module-architecture.md) para as decisões concretas tomadas na implementação (algumas mais específicas do que o previsto aqui, ex.: refresh token opaco em vez de JWT).

## Contexto

O produto vai precisar de autenticação, RBAC e controle de usuários. Esta sprint constrói só a fundação (sem regra de negócio), mas decisões de design que afetam a forma como o código será estruturado precisam ser registradas agora para orientar o trabalho futuro.

## Decisão (de design, não implementada)

- **Senhas**: hash com `argon2` (recomendação atual da OWASP), atrás da porta `IPasswordHasher` (`application/ports/IPasswordHasher.ts` — já existe, sem implementação).
- **Sessão**: JWT de acesso de vida curta + refresh token de vida longa com rotação, atrás da porta `ITokenProvider` (`application/ports/ITokenProvider.ts` — já existe, sem implementação).
- **RBAC**: papéis e permissões modelados como conceito de domínio (`domain/entities`, ainda vazio) quando a entidade `Usuário` existir; aplicado via middleware em `presentation/http/middlewares` que hoje não existe.

## Consequências

- Nenhum código de autenticação nasce nesta sprint — as portas documentam a intenção sem forçar uma implementação prematura de `User`/`Role`, que são conceitos de negócio ainda não definidos em detalhe.
- Quando a feature for construída, a implementação concreta entra em `infrastructure/security` (hoje só tem um `README.md` explicando isso) e é conectada ao `container` — nenhuma peça da fundação atual precisa ser refeita.

## Atualização

Este ADR registrava uma intenção de design; a implementação real (módulo `identity`, estrutura de pastas, decisões de token/cookie/RBAC) está no [ADR 0010](0010-identity-module-architecture.md). Mantido aqui como registro histórico da decisão original.
