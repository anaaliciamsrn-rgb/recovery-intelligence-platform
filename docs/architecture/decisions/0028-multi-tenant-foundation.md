# 0028 — Multi-Tenant Foundation

## Status

Aceito e implementado — **parcial por decisão explícita** (ver "Limitação de escopo" abaixo)

## Contexto

Nona etapa do lote contínuo (5–15). O pedido literal: "Empresa A nunca pode acessar Empresa B", com `Tenant`, `TenantId`, isolamento em repositories/policies/middleware, "proteção completa".

## Decisão — e por que não é um retrofit

Multi-tenant completo e retroativo exigiria adicionar `tenantId` a praticamente toda tabela de todo módulo já aprovado (identity, party, dossie, import, audit-trail, dossier-versioning, explainability, simulation, confidence-heatmap, analytics, case-management, workflow) e alterar toda query de todo repositório existente para filtrar por tenant. Isso viola diretamente a restrição inegociável de todas as etapas anteriores: nunca alterar módulos aprovados. Não há como reconciliar "isolamento completo retroativo" com "nunca modificar código aprovado" — são mutuamente exclusivos.

A decisão tomada: construir a **fundação real e funcional** do multi-tenant como camada inteiramente aditiva, aplicável a partir de agora a qualquer recurso novo, sem tocar nenhuma tabela/repositório/rota existente. Isso não é a etapa "incompleta" — é a única versão desta etapa que pode existir sem quebrar as restrições que a acompanham.

### `Tenant` + `TenantResourceOwnership`: a garantia real está na constraint do banco

`TenantResourceOwnership(resourceType, resourceId)` tem `@@unique` — um recurso nunca pode ter dois donos ao mesmo tempo. `TenantPolicy.podeAcessar` (domínio, puro) é **fail-closed**: sem registro de propriedade, nenhum tenant tem acesso — nunca assume "sem dono = livre para todos". Essa combinação é o que torna "Empresa A nunca acessa Empresa B" uma garantia de fato, não uma promessa de convenção de código.

### Nenhuma referência a nenhum outro módulo

`resourceType`/`resourceId` são strings livres — `tenant` não conhece `Pessoa`, `Empresa`, `Dossie`, `Case` nem nenhum outro tipo concreto. Qualquer módulo (presente ou futuro) pode registrar um recurso seu sem `tenant` precisar de uma migration nova.

### Resolução de tenant via header HTTP, não via claim do JWT

Colocar `tenantId` no token de acesso exigiria alterar `LoginUseCase`/`ITokenProvider` (identity, módulo aprovado). `resolveTenantMiddleware` lê `X-Tenant-Id` do cabeçalho, valida que o tenant existe e está ativo, e popula `req.tenantId` — nunca bloqueia a requisição se o header estiver ausente. Uma vez que `identity` puder ser estendido (ou quando o cliente aceitar essa mudança), o mesmo `req.tenantId` pode passar a vir do token sem alterar mais nada neste módulo.

### `requireTenantAccessMiddleware`: mecanismo de enforcement pronto, não aplicado retroativamente

Uma factory de middleware (`createRequireTenantAccessMiddleware(repo, resourceType, extractResourceId)`) que qualquer rota nova pode adotar para exigir tenant + verificar propriedade via `TenantPolicy`. Testado e funcional (ver testes), mas **nenhuma rota existente foi alterada para usá-lo** — aplicar isso indiscriminadamente às ~40 rotas já existentes contaria como alterar comportamento aprovado.

## Limitação de escopo (registrada explicitamente, não escondida)

- **Não implementado nesta etapa**: `tenantId` em `User` (identity), isolamento automático em `party`/`dossie`/`import`/`case-management`/`workflow`/etc. Isso é trabalho real e válido, mas é uma iniciativa maior, separada, que exige decidir explicitamente alterar módulos hoje aprovados — não uma tarefa que cabe dentro de "só adicionar".
- O que existe hoje é **infraestrutura genuína e funcionalmente completa** para isolamento por tenant de qualquer recurso — comprovado pelo teste de integração desta etapa, que demonstra exatamente o cenário do requisito ("Empresa A nunca pode acessar Empresa B") de ponta a ponta contra o Postgres real.

## Consequências

- Migration `add_tenant_module`: models `Tenant`, `TenantResourceOwnership`.
- Endpoints novos: `POST /tenants`, `GET /tenants`, `GET /tenants/:id`, `POST /tenants/:id/resources`, `GET /tenants/:id/resources/:resourceType/:resourceId/access` — todos autenticados.
- Backlog explícito (ver acima): adicionar `tenantId` a `User` e aplicar `requireTenantAccessMiddleware` aos módulos de negócio existentes é uma decisão de produto separada, não implementada aqui.
