# 0003 — Injeção de dependência manual via composition root

## Status

Aceito

## Contexto

A Clean Architecture ([0001](0001-clean-architecture.md)) exige que `application`/`domain` dependam apenas de interfaces (ports), e que algo monte as implementações concretas em runtime. Frameworks de DI (InversifyJS, tsyringe, NestJS DI) resolvem isso com decorators e um container reflexivo, mas adicionam uma camada de "magia" (metadata reflection, resolução implícita por tipo) que dificulta rastrear "quem constrói o quê" só lendo o código.

## Decisão

Usar **injeção de dependência manual via construtor**, com um único módulo `container/index.ts` (composition root) responsável por instanciar infraestrutura concreta (Prisma, Redis, logger) e passá-la para os use cases e controllers via construtor.

## Consequências

- Zero dependência de decorators/reflection — o wiring é só código TypeScript comum, com autocomplete e "go to definition" funcionando normalmente.
- Fácil substituir uma implementação por um fake/mock em teste: basta construir a classe manualmente com o fake no lugar do argumento.
- Contrapartida: conforme o número de use cases crescer, `container/index.ts` cresce também. Se isso se tornar um problema real (não é hoje, com um único use case), a mitigação é dividir o container por _feature_ (ex.: `container/health.container.ts`, `container/auth.container.ts`) — não introduzir um framework de DI antes de sentir a dor.
