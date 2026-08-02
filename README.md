# Recovery Intelligence Platform

Plataforma enterprise de inteligência para consulta de pessoas físicas e jurídicas, avaliação de risco e gestão do ciclo completo de recuperação de crédito — do dado bruto importado até a ação de cobrança recomendada, executada e auditada.

## O que a plataforma faz

- **Consulta e identidade**: cadastro de Pessoas/Empresas, participação societária, resolução de identidade entre fontes (documento completo ou mascarado).
- **Dossiê e evidências**: um dossiê por sujeito, evidências de múltiplas fontes externas (PGFN, Receita, DataJud), nunca perdidas — sempre versionadas.
- **Classificação de risco explicável**: motor de regras que nunca é uma caixa-preta — cada classificação vem com o fator, a fonte e o motivo exatos.
- **Recomendação de cobrança**: canal e estratégia sugeridos por regras de negócio auditáveis.
- **Simulação**: "e se essa evidência mudasse?" — sem gravar nada, sem afetar o dossiê real.
- **Importação profissional de planilhas**: PGFN com CPF/CNPJ mascarado (LGPD desde o desenho, nunca um documento completo é lido, computado ou logado), preview antes de importar, detecção de duplicados, rollback lógico, histórico completo.
- **Gestão de casos**: ciclo de cobrança com status, owner, prioridade, notas e timeline.
- **Workflow configurável**: estados e transições inteiramente por dados — um fluxo novo nunca exige uma linha de código nova.
- **Multi-tenant, RBAC granular, regras configuráveis, feature flags, jobs agendados e cache** — a camada enterprise que sustenta operação em escala.
- **Auditoria total**: toda ação relevante do sistema é um evento de auditoria append-only, correlacionável por request.

## Por que isto não é um CRUD com nome bonito

Todo módulo é **explicável por construção** — nenhuma decisão de risco, recomendação ou classificação existe sem o motivo, a fonte e o fator que a geraram, expostos na própria resposta da API. Auditoria, versionamento de dossiê e RBAC não foram adicionados depois: fazem parte da arquitetura desde a primeira linha de cada módulo que os usa. E cada decisão de escopo — o que foi construído, o que foi deliberadamente deixado de fora e por quê — está registrada em [ADR](docs/architecture/decisions), não perdida em um chat de Slack.

## Arquitetura

`apps/api` segue Clean Architecture com quatro camadas (`domain`, `application`, `infrastructure`, `presentation`) por módulo de negócio, mais um composition root (`container`) — enforced automaticamente pelo ESLint ([ADR 0009](docs/architecture/decisions/0009-lint-enforced-architecture-boundaries.md)). Ver o mapa completo dos **20 módulos**, o modelo de dados, o fluxo de uma requisição e o modelo de RBAC em [`docs/architecture/overview.md`](docs/architecture/overview.md).

```
recovery-intelligence-platform/
├── apps/
│   ├── api/     # Backend Express — Clean Architecture, 20 módulos, ~95 endpoints
│   └── web/     # Frontend React — dashboards, heatmaps, timeline, relatório executivo
├── packages/
│   └── shared-types/   # Contratos TS compartilhados entre api e web
├── docs/architecture/  # ADRs (34+) e visão geral da arquitetura
├── docker-compose.yml
└── .github/workflows/ci.yml
```

### Módulos (`apps/api/src/modules`)

| Domínio de negócio                               | Plataforma / enterprise                             |
| ------------------------------------------------ | --------------------------------------------------- |
| `identity` — auth, sessões, RBAC                 | `tenant` — fundação multi-tenant                    |
| `party` — Pessoa/Empresa/participação societária | `rule-builder` — motor de regras configuráveis      |
| `identity-resolution` — resolução entre fontes   | `feature-flags` — flags por tenant/ambiente/usuário |
| `dossie` — dossiê base e evidências              | `scheduler` — jobs agendados, retry, fila-morta     |
| `classification` — motor de risco explicável     | `cache` — cache-aside sobre Redis                   |
| `explainability` — explicação fator a fator      | `audit-trail` — auditoria enterprise append-only    |
| `recommendation` — canal de cobrança recomendado | `dossier-versioning` — histórico e diff de versões  |
| `prompt-builder` — prompts estruturados para IA  | `simulation` — laboratório de decisão (dry-run)     |
| `import` — importação PGFN enterprise            | `confidence-heatmap` — confiança por fonte          |
| `case-management` — ciclo de cobrança            | `analytics` — KPIs agregados da plataforma          |
| `workflow` — motor de estados configurável       |                                                     |

## API — documentação interativa (Swagger/OpenAPI)

Com a API rodando: **http://localhost:3000/api/v1/docs**. JSON puro em `/api/v1/openapi.json`.

## Rodando localmente

Pré-requisitos: Node.js 24+, pnpm (`corepack enable pnpm` ou `npm i -g pnpm`), Docker.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose up -d postgres redis
pnpm --filter @rip/api prisma:generate
pnpm --filter @rip/api exec prisma migrate deploy
pnpm dev:api
```

Em outro terminal, para o frontend:

```bash
pnpm dev:web
```

Verificação de que a stack está de fato conectada:

```bash
curl http://localhost:3000/api/v1/health
```

Deve responder `200` com `{"status":"ok","dependencies":{"database":"ok","cache":"ok"}}`.

## Rodando com Docker Compose (stack completa)

```bash
cp .env.example .env
docker compose up -d --build
```

- API: http://localhost:3000/api/v1/health · Swagger: http://localhost:3000/api/v1/docs
- Frontend: http://localhost:8080

## Scripts úteis (raiz)

| Comando                             | O que faz                                                                |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `pnpm lint` / `pnpm lint:fix`       | ESLint em todo o monorepo (inclui enforcement de arquitetura)            |
| `pnpm typecheck`                    | `tsc --noEmit` em cada workspace                                         |
| `pnpm test`                         | Jest em cada workspace (integration tests exigem Postgres/Redis rodando) |
| `pnpm format` / `pnpm format:check` | Prettier                                                                 |
| `pnpm build`                        | Build de produção de cada workspace                                      |
| `pnpm dev:api` / `pnpm dev:web`     | Sobe a API ou o frontend em modo desenvolvimento                         |

## Qualidade, segurança e observabilidade já embutidos

Helmet, CORS configurável por env, rate limiting (Redis-backed, com limite dedicado e mais estrito para login), request ID + logging estruturado (Pino, com redaction de campos sensíveis — nunca um CPF completo ou senha em log), métricas Prometheus em `/api/v1/metrics`, tratamento centralizado de erros com taxonomia estável (`AppErrorKind`), validação de variáveis de ambiente com fail-fast (Zod), Dockerfiles multi-stage com usuário não-root, autenticação JWT + refresh rotativo com detecção de reuso, RBAC granular por permissão (não por papel hardcoded no código de negócio).

## Testes

666+ testes (unitários e de integração contra Postgres/Redis reais), ~95% de cobertura de linhas em `apps/api`. Cada módulo tem sua própria ADR documentando as decisões de arquitetura e as limitações de escopo conhecidas — nunca escondidas.

## Documentação

- [Visão geral da arquitetura](docs/architecture/overview.md)
- [ADRs](docs/architecture/decisions) — toda decisão de arquitetura relevante, incluindo o que foi deliberadamente deixado de fora e por quê
