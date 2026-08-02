# 0001 — Clean Architecture com quatro camadas

## Status

Aceito

## Contexto

A plataforma vai crescer para incluir múltiplas fontes de dados externas (consulta de CPF/CNPJ, histórico de processos, histórico financeiro), regras de score, geração de dossiês e integrações futuras. Sem uma separação clara, é comum que regra de negócio acabe presa a um controller Express ou a uma query Prisma específica, tornando trocas de framework/ORM ou testes unitários muito custosos.

## Decisão

Adotar Clean Architecture com quatro camadas em `apps/api/src`:

- **domain** — entidades, value objects e erros de negócio. Não importa nada de fora.
- **application** — casos de uso e _ports_ (interfaces) para tudo que a aplicação precisa do mundo externo. Só importa `domain`.
- **infrastructure** — implementações concretas dos ports (Prisma, Redis, logger). Implementa interfaces de `domain`/`application`, nunca o contrário.
- **presentation** — camada HTTP (Express): rotas, controllers, middlewares. Traduz HTTP ↔ chamadas de use case.

Um `container` (composition root) é o único módulo que conhece tanto os ports quanto as implementações concretas, e faz o wiring manual (ver [0003](0003-manual-dependency-injection.md)).

## Consequências

- Regra de negócio testável sem banco, sem HTTP, sem framework.
- Trocar Prisma por outro ORM, ou Express por Fastify, afeta só `infrastructure`/`presentation` — `domain`/`application` não mudam.
- Custo: mais arquivos/indireção do que um CRUD direto controller→banco. Aceitável dado o horizonte do produto (múltiplas fontes de dados, regras de score, auditoria).
- A regra de dependência é verificada automaticamente pelo `eslint-plugin-boundaries` (ver [0009](0009-lint-enforced-architecture-boundaries.md)), não depende de disciplina manual em code review.
