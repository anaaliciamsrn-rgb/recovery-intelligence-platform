# 0033 — Cache Layer

## Status

Aceito e implementado — **camada genérica, não retroativa** (mesma categoria de decisão das ADRs 0028/0030/0031/0032)

## Contexto

Décima quarta etapa do lote contínuo (5–15). O pedido: cache inteligente via Redis, TTL, invalidação, cache por endpoint/dossiê/analytics, nunca quebrar consistência.

## Decisão

`modules/cache` — uma camada de cache-aside genérica sobre o Redis já usado pela plataforma (mesma instância `ioredis` do rate limit), organizada por `namespace` + `identifier` opcional:

- **`CacheKey`** (domínio, puro) — constrói `cache:<namespace>` ou `cache:<namespace>:<identifier>`. `namespace` é o "por endpoint/analytics" do requisito (ex.: `analytics`, `confidence-heatmap`); `identifier` é o "por dossiê" (ex.: um `dossieId`). Prefixo `cache:` isola das chaves de rate limit (`rl:...`).
- **`CacheTtlPolicy`** (domínio, puro) — TTL por namespace com fallback: `analytics` (120s, agrega a plataforma inteira, muda pouco — ADR 0025) e `confidence-heatmap`/`dossie` (30s, refletem um caso específico que pode mudar a qualquer evidência nova) têm defaults próprios; qualquer namespace novo cai num default de 60s. Um `ttlSegundos` explícito por chamada sempre vence o default do namespace — "TTL" do requisito é literalmente configurável, não hardcoded.
- **`RedisCacheStore`** (infraestrutura) — implementa `ICacheStore` (application) com `SET ... EX`, `GET`, `DEL`, `TTL`, `INCR`, e invalidação por prefixo via `SCAN` (nunca `KEYS`, que bloqueia o Redis inteiro em produção com muitas chaves).
- **Estatísticas de hit/miss por namespace** — cada leitura incrementa um contador Redis (`cache:stats:<namespace>:hits|misses`); `GET /cache/stats/:namespace` expõe hits, misses e `hitRatio` — a parte "inteligente" observável do requisito.

### Endpoints

`PUT /cache/entries/:namespace` (grava, com `identifier`/`ttlSegundos` opcionais no corpo), `GET /cache/entries/:namespace` (lê, `identifier` opcional via query — devolve `hit`, `valor`, `ttlRestanteSegundos`), `DELETE /cache/entries/:namespace` (invalida — com `identifier`, remove só aquela entrada; sem `identifier`, remove o namespace inteiro de uma vez, via `SCAN` + `DEL`), `GET /cache/stats/:namespace`.

### RBAC (ADR 0029)

`cache:read` (leitura e stats) e `cache:write` (gravar/invalidar). `ADMIN`/`MANAGER` têm ambas; `AUDITOR` só leitura; `COLLECTOR`/`ANALYST`/`VIEWER` nenhuma.

### Por que "nunca quebrar consistência" está garantido por construção

Nenhum módulo aprovado (dossie, analytics, confidence-heatmap, etc.) foi alterado para ler ou escrever neste cache automaticamente — nada muda de comportamento para nenhuma rota existente. O cache criado aqui é inteiramente opt-in: só existe o que for explicitamente gravado via `PUT /cache/entries/:namespace`, e só fica desatualizado quem chamar esse endpoint e depois não invalidar. Não há leitura automática de um cache potencialmente obsoleto no caminho de nenhuma requisição de negócio hoje aprovada — logo não há risco de inconsistência introduzido por esta etapa, por não haver consumidor automático ainda (ver limitação abaixo).

## Limitação de escopo (registrada explicitamente, não escondida)

- **Nenhum controller/use case existente (dossie, analytics, confidence-heatmap) lê ou escreve neste cache automaticamente.** "Cache por endpoint/dossiê/analytics" nesta etapa significa "a infraestrutura genérica e funcional existe, correta para qualquer consumidor futuro adotar por namespace" — conectar um endpoint aprovado para de fato cachear sua própria resposta exigiria alterar aquele módulo (ex.: `AnalyticsController` chamando `GetCacheEntryUseCase` antes de recalcular), fora do escopo de "só adicionar" deste lote. Comprovado e testado como camada standalone (testes de integração gravam, leem, invalidam e medem hit/miss via os próprios endpoints deste módulo).
- Estatísticas de hit/miss são contadores cumulativos sem reset automático (crescem enquanto o processo/Redis viver) — não há endpoint de reset nesta etapa.

## Consequências

- Nenhuma migration (cache é inteiramente Redis, sem tabela Postgres).
- Endpoints novos: `PUT /cache/entries/:namespace`, `GET /cache/entries/:namespace`, `DELETE /cache/entries/:namespace`, `GET /cache/stats/:namespace`.
- Backlog explícito: conectar um consumidor real (ex.: `AnalyticsController` cacheando `GET /analytics/summary` e invalidando via o mesmo mecanismo do audit-trail/dossier-versioning — observar a rota e invalidar `dossie:<id>` a cada evidência nova) é decisão de produto separada, não implementada aqui.
