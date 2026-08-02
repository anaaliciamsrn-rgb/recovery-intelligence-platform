# 0030 — Rule Builder

## Status

Aceito e implementado — **fundação nova, não retroativa** (mesma categoria de decisão da ADR 0028)

## Contexto

Décima primeira etapa do lote contínuo (5–15). O pedido: um motor de regras configuráveis — peso, prioridade, condição, ação, versionamento — "substituindo a ideia de regras hardcoded", sem recompilar para criar uma regra nova.

A plataforma já tem um motor de regras hardcoded, aprovado e em produção: `modules/classification` (`IClassificationRule` + `PendenciaFiscalPgfnRule`/`ProcessoJudicialDataJudRule`/`SituacaoCadastralReceitaRule`, ver ADR 0016). Trocar esse motor por um baseado em dados exigiria alterar `ClassificarDossieUseCase` e reescrever cada regra hoje em código como uma linha de configuração — uma migração de comportamento real, não uma adição. Isso conflita diretamente com "nunca alterar comportamento aprovado" e "nunca remover código existente".

## Decisão

Construir o Rule Builder como um módulo novo e completo (`modules/rule-builder`), do mesmo jeito que o Tenant (ADR 0028) resolveu uma tensão equivalente: uma fundação genuína e funcional, correta desde já para qualquer regra nova que precise ser configurável, sem tocar no motor de classificação hardcoded existente.

### Modelo

- **`RuleDefinition`** — `nome`, `descricao`, `recurso` (string livre — identifica a que domínio a regra se aplica; o módulo não conhece `classificacao`/`workflow`/nenhum outro módulo concreto), `condicoes` (`RuleCondition[]`, semântica E — todas precisam bater), `peso`, `prioridade`, `acao` (string livre, mesmo padrão de `WorkflowTransition.acao` — rótulo, não despacho automático), `ativo`, `versaoAtual`.
- **`RuleVersionEntry`** — histórico append-only, próprio deste módulo. Independente do versionamento de dossiê (`dossier-versioning`, ADR 0022) — são conceitos diferentes (versão de uma regra de negócio vs. snapshot de um dossiê) e não haveria ganho real em acoplar um ao outro.
- **`RuleEvaluator`** — serviço de domínio puro: recebe regras ativas + um contexto (`Record<string, unknown>`), casa as que satisfazem todas as condições, devolve as casadas ordenadas por prioridade desc/peso desc e a soma dos pesos (`pontuacaoTotal`). Nunca decide sozinho "o que fazer" — só identifica candidatas; a decisão final é de quem chama.
- `RuleCondition`/operadores (`IGUAL`/`DIFERENTE`/`MAIOR_QUE`/`MENOR_QUE`) são uma cópia independente da mesma forma usada em `WorkflowCondition` (Etapa 8) — duplicação deliberada em vez de import cross-module, mesmo padrão já registrado em ADRs anteriores (0024/0025) para não acoplar módulos por uma estrutura pequena.

### Versionamento sem recompilar

Toda criação nasce na versão 1. Toda revisão (`PATCH /rules/:id`) chama `RuleDefinition.revisar()`, que valida a nova revisão com as mesmas regras de `create()`, incrementa `versaoAtual`, e o use case grava uma `RuleVersionEntry` nova — a entrada anterior nunca é sobrescrita ou apagada. Criar uma regra nova ou revisar uma existente é sempre inserir uma linha; nenhum deploy é necessário.

### Endpoints

`POST /rules` (criar), `GET /rules` (listar, filtra por `recurso`/`ativo`), `GET /rules/:id` (detalhe + histórico completo de versões), `PATCH /rules/:id` (revisar), `POST /rules/evaluate` (avaliar um contexto contra as regras ativas de um `recurso`).

### RBAC (ADR 0029)

Seguindo o mesmo padrão já estabelecido na Etapa 10, este módulo nasce com RBAC aplicado desde o primeiro commit — não como uma extensão posterior. Permissões novas: `rule:read` (rotas de leitura e `evaluate`) e `rule:write` (criar/revisar). `ADMIN` e `MANAGER` têm ambas; `COLLECTOR` e `AUDITOR` só leitura; `ANALYST`/`VIEWER` não ganharam nada (mesma limitação de `VIEWER` já documentada na ADR 0029).

## Limitação de escopo (registrada explicitamente, não escondida)

- **O motor de classificação hardcoded (`modules/classification`) não foi alterado e não consome este módulo.** As regras `PendenciaFiscalPgfnRule`/`ProcessoJudicialDataJudRule`/`SituacaoCadastralReceitaRule` continuam sendo código, exatamente como estavam. "Substituir regras hardcoded" nesta etapa significa "oferecer a infraestrutura real e completa para que regras futuras não precisem ser código" — não "migrar as três regras já aprovadas para dados", o que seria uma alteração de comportamento aprovado.
- Nenhum caso de uso existente (classificação, recomendação, workflow) chama `EvaluateRulesUseCase` automaticamente. Conectar um consumidor real a este motor é uma decisão de produto separada, registrada como backlog.

## Consequências

- Migration `add_rule_builder_module`: models `RuleDefinition`, `RuleVersionEntry`.
- Endpoints novos: `POST /rules`, `GET /rules`, `GET /rules/:id`, `PATCH /rules/:id`, `POST /rules/evaluate` — todos autenticados e autorizados por permissão.
- Backlog explícito: nenhum módulo de negócio hoje consome `EvaluateRulesUseCase`; migrar (opcionalmente, e só por decisão de produto futura) as regras hardcoded de `classification` para este motor é trabalho real, separado, não incluído aqui.
