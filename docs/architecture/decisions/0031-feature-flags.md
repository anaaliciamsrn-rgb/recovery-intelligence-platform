# 0031 — Feature Flags

## Status

Aceito e implementado

## Contexto

Décima segunda etapa do lote contínuo (5–15). O pedido: ativar/desativar módulos sem deploy, com flags por tenant, por ambiente e por usuário.

## Decisão

`modules/feature-flags` — dois agregados:

- **`FeatureFlag`** — `chave` (única, validada por regex `^[a-z0-9]+([.-][a-z0-9]+)*$`, mesmo estilo do `slug` de `Tenant`, ADR 0028), `descricao`, `ativoPadrao` (o valor usado quando nada mais se aplica).
- **`FeatureFlagOverride`** — a exceção de um escopo específico. `escopoTipo` é um enum fechado (`TENANT | AMBIENTE | USUARIO`); `escopoValor` é string livre — o módulo não conhece `Tenant.id`/ambiente de deploy/`User.id` de nenhum outro módulo, mesmo princípio de acoplamento zero já usado por `TenantResourceOwnership` (ADR 0028). `@@unique([featureFlagId, escopoTipo, escopoValor])` garante no máximo um override por escopo por flag.

### `FeatureFlagResolver` — precedência fixa e explicável

Serviço de domínio puro: dado uma flag + seus overrides + um contexto (`tenantId`/`ambiente`/`userId`, todos opcionais), resolve `{ ativo, origem }`. Precedência do mais específico para o mais genérico: **usuário > tenant > ambiente > `ativoPadrao`**. A resposta sempre inclui `origem` — nunca é uma caixa-preta sobre por que a flag resolveu para aquele valor, mesmo princípio de explicabilidade já usado em `explainability` (ADR 0020).

### Por que não é um booleano simples por linha

Um modelo só com `ativo: boolean` por flag não atenderia "por tenant, por ambiente, por usuário" ao mesmo tempo — precisaria de uma coluna por dimensão, ou uma tabela por dimensão. O modelo escolhido (uma flag + overrides tipados por escopo) suporta as três dimensões pedidas com uma única tabela de override, e suporta novas dimensões futuras (ex.: por versão de app) sem migration, só um novo valor de `FeatureFlagScopeType` — que, sendo um enum de banco, ainda exige migration para novos tipos; documentado como limitação abaixo.

### Endpoints

`POST /feature-flags` (criar), `GET /feature-flags` (listar), `GET /feature-flags/:chave` (detalhe + todos os overrides), `PATCH /feature-flags/:chave` (atualizar descrição/padrão), `PUT /feature-flags/:chave/overrides` (criar ou atualizar — upsert — o override de um escopo), `DELETE /feature-flags/:chave/overrides/:escopoTipo/:escopoValor` (remover override — o escopo volta a herdar o override mais amplo aplicável, ou `ativoPadrao`), `GET /feature-flags/:chave/evaluate` (resolver para um contexto, via query string).

### RBAC (ADR 0029)

`feature-flag:read` (leitura e `evaluate`) e `feature-flag:write` (criar/atualizar/definir e remover override). `ADMIN` e `MANAGER` têm ambas; `AUDITOR` só leitura; `COLLECTOR` não recebeu nenhuma (não é uma decisão operacional do dia a dia de cobrança); `ANALYST`/`VIEWER` seguem sem nenhuma, mesma limitação já documentada na ADR 0029.

## Limitação de escopo (registrada explicitamente, não escondida)

- **Nenhum módulo existente consulta `EvaluateFeatureFlagUseCase` para decidir se algo está ativo.** "Ativar/desativar módulos" nesta etapa significa "a infraestrutura real e completa para isso existe e funciona" — conectar um módulo de negócio hoje aprovado para checar uma flag antes de executar seu comportamento é uma alteração daquele módulo, fora do escopo de "só adicionar" desta etapa (mesmo raciocínio já usado nas ADRs 0028/0030 para tenant e regras).
- `FeatureFlagScopeType` é um enum de banco fechado (`TENANT`/`AMBIENTE`/`USUARIO`, exatamente os três pedidos) — adicionar uma quarta dimensão de escopo no futuro exige uma migration para estender o enum, não é livre de deploy como o restante do sistema de flags.

## Consequências

- Migration `add_feature_flags_module`: models `FeatureFlag`, `FeatureFlagOverride`, enum `FeatureFlagScopeType`.
- Endpoints novos: `POST /feature-flags`, `GET /feature-flags`, `GET /feature-flags/:chave`, `PATCH /feature-flags/:chave`, `PUT /feature-flags/:chave/overrides`, `DELETE /feature-flags/:chave/overrides/:escopoTipo/:escopoValor`, `GET /feature-flags/:chave/evaluate`.
- Backlog explícito: nenhum módulo de negócio consome as flags criadas aqui; conectar um consumidor real é decisão de produto futura.
