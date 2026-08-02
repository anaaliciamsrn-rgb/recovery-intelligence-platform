# 0006 — Pino para logging estruturado

## Status

Aceito

## Contexto

Este produto lida com CPF, CNPJ, dados financeiros e (futuramente) credenciais de usuário. Logar em texto livre convida a vazar dado sensível em qualquer `console.log` esquecido, e dificulta buscar/agregar logs em produção.

## Decisão

Usar `pino` para logging estruturado (JSON em produção, formatado e colorido em desenvolvimento via `pino-pretty`), acessado pelo resto do código só através do port `ILogger` (`application/ports/ILogger.ts`) — nunca importando `pino` diretamente fora de `infrastructure/logging`. `PinoLogger` adapta a assinatura `(message, meta)` do port para a assinatura nativa do pino `(mergingObject, message)`.

O logger é configurado com `redact` para os campos `password`, `token` e `authorization` em qualquer profundidade do objeto logado, removendo o valor em vez de mascará-lo.

## Consequências

- Todo log de requisição inclui `requestId` (ver `request-id.middleware.ts`), permitindo correlacionar uma linha de log de erro com a requisição HTTP que a originou.
- Quando entidades de negócio existirem, campos sensíveis específicos do domínio (CPF, CNPJ) precisam ser adicionados à lista de `redact` — este ADR fixa o mecanismo, não a lista final de campos.
- Trocar pino por outro logger no futuro é uma mudança isolada em `infrastructure/logging`, graças ao port `ILogger`.
