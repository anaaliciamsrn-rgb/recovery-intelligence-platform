# 0005 — Zod para validação de variáveis de ambiente

## Status

Aceito

## Contexto

Uma variável de ambiente ausente ou malformada (`DATABASE_URL` errado, `PORT` não numérico) deve derrubar o processo **no boot**, com uma mensagem clara — não deve causar uma falha confusa minutos depois, na primeira requisição que tocar o banco.

## Decisão

`apps/api/src/shared/config/env.ts` define um schema Zod para todas as variáveis de ambiente consumidas pela aplicação, com defaults sensatos onde faz sentido (`PORT`, `LOG_LEVEL`, rate limit) e validação estrita onde não (`DATABASE_URL`, `REDIS_URL` precisam ser URLs válidas). O parsing roda uma única vez, no import do módulo; se falhar, loga os campos inválidos e chama `process.exit(1)` antes de qualquer outra coisa inicializar.

Esse módulo mora em `shared/`, não em `infrastructure/`: apesar de ler `process.env` (um detalhe de runtime), o _tipo_ `Env` resultante é consumido por `presentation` (CORS, rate limit, error handler) e por `container` — colocá-lo em `infrastructure` obrigaria `presentation` a depender de `infrastructure`, violando a regra de dependência de [0001](0001-clean-architecture.md). Configuração de boot é tratada como preocupação transversal, não como um _port_ substituível.

## Consequências

- Zero chance de a aplicação rodar "quase funcionando" com uma env var faltando — ou sobe corretamente, ou não sobe.
- `Env` é um tipo único e central; qualquer nova variável de ambiente precisa passar por esse schema, o que documenta automaticamente todas as configurações da aplicação em um só lugar.
