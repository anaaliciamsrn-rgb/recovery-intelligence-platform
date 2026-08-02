# 0029 — RBAC Enterprise

## Status

Aceito e implementado — **com uma limitação conhecida e documentada** (ver "Limitação conhecida: `VIEWER`" abaixo)

## Contexto

Décima etapa do lote contínuo (5–15). O pedido: permissões granulares por papel para `Admin`, `Manager`, `Collector`, `Viewer`, `Auditor`, aplicadas por endpoint, por recurso, por operação.

O módulo `identity` já continha uma fundação de RBAC funcional, construída em trabalho anterior a este lote: `Role` (`ADMIN | ANALYST | VIEWER`), `Permission` (3 permissões, todas de `identity`), `RolePermissionPolicy` (domain service puro, `Role[] → Set<Permission>`), e `createAuthorizeMiddleware(permission)` (presentation, deny-by-default, já usado em `DELETE /auth/sessions/:id`). Nenhuma rota das Etapas 5–9 usava esse mecanismo ainda.

## Decisão

Estender (nunca substituir) as três peças existentes:

- **`Role`**: adicionados `MANAGER`, `COLLECTOR`, `AUDITOR`. `ADMIN`, `ANALYST`, `VIEWER` permanecem com os mesmos identificadores e o mesmo significado que já tinham.
- **`Permission`**: adicionadas `case:read`, `case:write`, `workflow:read`, `workflow:write`, `tenant:manage`, `analytics:read`, `confidence-heatmap:read` — uma permissão por recurso/operação dos módulos das Etapas 5–9. As 3 permissões de `identity` já existentes não foram tocadas.
- **`RolePermissionPolicy.ROLE_PERMISSIONS`**: `ADMIN` recebeu todas as novas permissões (continua sendo o papel universal). `MANAGER` recebeu leitura+escrita de `case`/`workflow`, gestão de `tenant`, e leitura de `analytics`/`confidence-heatmap`. `COLLECTOR` recebeu leitura+escrita de `case`, leitura de `workflow` e de `confidence-heatmap` (perfil operacional de quem trabalha o caso, não administra fluxo nem tenant). `AUDITOR` recebeu leitura de `case`/`workflow`/`analytics`/`confidence-heatmap` e mantém `identity:view-audit-log` — perfil só-leitura, nunca escreve. `ANALYST` e `VIEWER` não ganharam nenhuma permissão nova.

`createAuthorizeMiddleware` (sem alteração de código) foi aplicado nas rotas dos cinco módulos das Etapas 5–9:

| Módulo             | Rota                                                           | Permissão exigida         |
| ------------------ | -------------------------------------------------------------- | ------------------------- |
| confidence-heatmap | `GET /:dossieId`                                               | `confidence-heatmap:read` |
| analytics          | `GET /summary`                                                 | `analytics:read`          |
| case-management    | `POST /`, `PATCH /:id/status`, `PATCH /:id`, `POST /:id/notes` | `case:write`              |
| case-management    | `GET /`, `GET /:id`                                            | `case:read`               |
| workflow           | `POST /`, `POST /:id/instances`                                | `workflow:write`          |
| workflow           | `GET /`, `GET /:id`                                            | `workflow:read`           |
| workflow-instances | `POST /:id/trigger`                                            | `workflow:write`          |
| workflow-instances | `GET /:id`                                                     | `workflow:read`           |
| tenant             | todas                                                          | `tenant:manage`           |

`tenant` recebe uma única permissão para todas as rotas porque, nesta fase, toda operação do módulo (criar tenant, registrar recurso, consultar acesso) é inerentemente administrativa — não há ainda um caso de uso de "consulta de tenant" separado de "gestão de tenant" que justifique uma permissão `tenant:read` própria.

## Limitação conhecida: `VIEWER`

`tests/unit/identity/RolePermissionPolicy.test.ts` (pré-existente, não pode ser alterado por restrição explícita do lote) pina o comportamento:

```ts
expect(RolePermissionPolicy.resolvePermissions([Role.VIEWER]).size).toBe(0);
```

Ou seja: **`VIEWER` está travado em zero permissões por um teste já aprovado**, e não pode receber nenhuma permissão nova (nem `case:read`, nem `confidence-heatmap:read`) sem quebrar esse teste. Dado que "nunca quebrar teste existente" é uma restrição inegociável deste lote, a decisão foi:

- Manter `VIEWER` com `[]` — nenhuma permissão, exatamente como estava antes da Etapa 10.
- Dar aos três papéis **novos** (`MANAGER`, `COLLECTOR`, `AUDITOR`) as permissões de leitura que um "Viewer" enterprise tipicamente teria — `AUDITOR`, em particular, cobre o perfil "só leitura, com acesso amplo" que o pedido original de `Viewer` sugere.
- Documentar esta tensão aqui, em vez de escondê-la: **o papel literal `VIEWER` pedido no requisito não ganhou nenhuma permissão nova nesta etapa.** Se o produto precisar de um "Viewer" com leitura ampla de verdade, a solução correta é revisitar/reescrever aquele teste pinado como uma decisão de produto explícita — fora do escopo de "nunca quebrar teste existente" que rege este lote.

Nenhuma rota das Etapas 5–9 ficou acessível a `VIEWER`. Isso é coberto por teste (ver abaixo).

## Escopo: quais rotas foram gateadas

Só as rotas dos módulos construídos nas Etapas 5–9 (confidence-heatmap, analytics, case-management, workflow, tenant) receberam `createAuthorizeMiddleware`. As rotas da baseline pré-Etapa-1 (identity, party, dossie, classification, recommendation, prompt-builder, import) e das Etapas 1–4 (explainability, audit-trail, dossier-versioning, simulation) **não foram alteradas** — elas já eram aprovadas antes deste lote contínuo e "nunca alterar módulos aprovados" se aplica a elas. Aplicar RBAC granular a essas ~25 rotas restantes é trabalho real e válido, registrado como backlog (ver Consequências).

## Testes

- Novo arquivo `tests/unit/identity/RolePermissionPolicy.rbac-enterprise.test.ts` — cobre `MANAGER`/`COLLECTOR`/`AUDITOR`, confirma que `ANALYST` não ganhou nada novo, e confirma (via teste que passa, não que falha) que `VIEWER` permanece em zero permissões. O arquivo pinado original (`RolePermissionPolicy.test.ts`) não foi tocado.
- Os 5 testes de integração das Etapas 5–9 tiveram o usuário principal reautenticado com papel `ADMIN` (antes `ANALYST`, que nunca teve nenhuma das novas permissões) e cada um ganhou um novo teste dedicado provando `403` para um usuário `VIEWER`.

## Consequências

- Nenhuma migration nova (RBAC é código, sem tabela própria — mesma decisão já registrada na ADR 0010).
- Nenhum endpoint novo — só middleware adicionado a rotas já existentes.
- Backlog explícito: aplicar `createAuthorizeMiddleware` à baseline pré-Etapa-1 e às Etapas 1–4; revisitar o teste pinado de `VIEWER` como decisão de produto separada, caso o negócio precise de um papel "somente leitura" de fato funcional.
