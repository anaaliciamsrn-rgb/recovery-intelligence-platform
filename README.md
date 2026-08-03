# Recovery Intelligence Platform

Plataforma SaaS multi-tenant de inteligência para recuperação de crédito: cada empresa-cliente importa sua própria carteira, vê dossiês, score de risco explicável, recomendações de cobrança e dashboards — **sem nunca ver o dado de outra empresa-cliente**. Do dado bruto importado até a ação de cobrança recomendada, executada e auditada.

## O que a plataforma faz

- **Cadastro e autenticação real**: autocadastro, login, OAuth (Google/Microsoft, quando configurado), recuperação de senha por e-mail, gestão de sessões, aprovação administrativa de novos usuários.
- **Multi-tenant real**: cada empresa-cliente (tenant) é resolvida a partir do e-mail/empresa no cadastro e assinada no JWT — nunca um header falsificável. Nenhum tenant vê Dossiê, Caso, ou lote de importação de outro.
- **Importação de carteira de clientes**: upload de planilha (`.xlsx`), template para baixar e planilha de demonstração com 50 empresas fictícias originais — nunca copiadas de terceiros. Cada linha importada gera automaticamente: cadastro da Empresa, Dossiê, evidências das 5 fontes, sócios/administradores, classificação de risco, recomendação de cobrança e (quando o risco justifica) um Caso já aberto.
- **Consulta de identidade com confiança**: busca por CPF/CNPJ (mesmo incompleto ou com erro de digitação) e/ou nome — devolve a confiança de ser a mesma pessoa/empresa (`MATCH`/`POSSÍVEL CORRESPONDÊNCIA`/`SEM CORRESPONDÊNCIA`), nunca apresenta um palpite de baixa confiança como fato.
- **Dossiê e evidências, uma fonte real**: Receita Federal é consultada de verdade (BrasilAPI, dado público) para CNPJ — as outras quatro fontes (PGFN, DataJud, Portal da Transparência, CENPROT) são simuladas de forma determinística e claramente rotuladas como tal, porque não existe integração pública gratuita para elas. Nunca finge que uma fonte simulada é real.
- **Classificação de risco explicável**: motor de regras que nunca é caixa-preta — cada classificação vem com o fator, a fonte e o motivo exatos.
- **Recomendação de cobrança**: canal e estratégia sugeridos por regras de negócio auditáveis.
- **Simulação**: "e se essa evidência mudasse?" — sem gravar nada, sem afetar o dossiê real.
- **Gestão de casos**: ciclo de cobrança com status, prioridade, notas e timeline — inclusive casos abertos automaticamente pela triagem de risco.
- **Dashboards executivo e operacional**: KPIs, distribuição de risco, empresas em maior risco, alertas, evolução temporal — tudo derivado dos dados realmente importados pelo tenant, nunca fixo, nunca fictício por padrão.
- **Relatório executivo**: página dedicada, exportável para PDF via impressão nativa do navegador.
- **Workflow configurável, RBAC granular, regras configuráveis, feature flags, jobs agendados e cache** — a camada enterprise que sustenta operação em escala.
- **Auditoria total**: toda ação relevante do sistema é um evento de auditoria append-only, correlacionável por request.

## Por que isto não é um CRUD com nome bonito

Todo módulo é **explicável por construção** — nenhuma decisão de risco, recomendação ou classificação existe sem o motivo, a fonte e o fator que a geraram, expostos na própria resposta da API. Auditoria, versionamento de dossiê, RBAC e isolamento multi-tenant não foram adicionados depois: fazem parte da arquitetura desde a primeira linha de cada módulo que os usa. Nada que pareça funcionar sem funcionar de verdade: fontes simuladas são sempre rotuladas como simuladas, e a única integração externa real (Receita Federal) usa os mesmos quatro estados honestos de qualquer evidência (`ENCONTRADO`/`NAO_ENCONTRADO`/`NAO_CONSULTADO`/`ERRO_CONSULTA`) — nunca mascara uma falha de rede como "não encontrado". Cada decisão de escopo — o que foi construído, o que foi deliberadamente deixado de fora e por quê — está registrada em [ADR](docs/architecture/decisions), não perdida em um chat.

## Arquitetura

`apps/api` segue Clean Architecture com quatro camadas (`domain`, `application`, `infrastructure`, `presentation`) por módulo de negócio, mais um composition root (`container`) — enforced automaticamente pelo ESLint ([ADR 0009](docs/architecture/decisions/0009-lint-enforced-architecture-boundaries.md)). Ver o mapa completo dos **21 módulos**, o modelo de dados, o fluxo de uma requisição, o modelo de RBAC e o modelo de isolamento multi-tenant em [`docs/architecture/overview.md`](docs/architecture/overview.md).

```
recovery-intelligence-platform/
├── apps/
│   ├── api/     # Backend Express — Clean Architecture, 21 módulos, ~100 endpoints
│   └── web/     # Frontend React — auth, importação, dashboards, dossiê, relatório executivo
├── packages/
│   └── shared-types/   # Contratos TS compartilhados entre api e web
├── docs/architecture/  # ADRs (38+) e visão geral da arquitetura
├── docker-compose.yml
└── .github/workflows/ci.yml
```

### Módulos (`apps/api/src/modules`)

| Domínio de negócio                                | Plataforma / enterprise                             |
| ------------------------------------------------- | --------------------------------------------------- |
| `identity` — auth, cadastro, OAuth, sessões, RBAC | `tenant` — isolamento multi-tenant real             |
| `party` — Pessoa/Empresa/participação societária  | `rule-builder` — motor de regras configuráveis      |
| `identity-resolution` — busca com confiança       | `feature-flags` — flags por tenant/ambiente/usuário |
| `dossie` — dossiê base e evidências               | `scheduler` — jobs agendados, retry, fila-morta     |
| `classification` — motor de risco explicável      | `cache` — cache-aside sobre Redis                   |
| `explainability` — explicação fator a fator       | `audit-trail` — auditoria enterprise append-only    |
| `recommendation` — canal de cobrança recomendado  | `dossier-versioning` — histórico e diff de versões  |
| `prompt-builder` — prompts estruturados para IA   | `simulation` — laboratório de decisão (dry-run)     |
| `import` — importação de carteira + PGFN          | `confidence-heatmap` — confiança por fonte          |
| `case-management` — ciclo de cobrança             | `analytics` — KPIs agregados por tenant             |
| `workflow` — motor de estados configurável        |                                                     |

### Frontend (`apps/web/src/pages`)

Landing page → Cadastro/Login/Recuperação de senha → `AppShell` (sidebar + topbar) com: Dashboard executivo, Operacional, Casos, **Consultar CPF/CNPJ**, Relacionamentos societários, **Importações** (upload, template, demo, histórico, resetar dados), Dossiê (heatmap de confiança + análise da IA + timeline), Relatório executivo (impressão), Minha conta, Configurações (white-label), Usuários (admin).

## Integrações externas — o que é real e o que é simulado

| Fonte                                           | Status         | Detalhe                                                                                                                                                                                                                                                              |
| ----------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Receita Federal (CNPJ)                          | **Real**       | [BrasilAPI](https://brasilapi.com.br) — proxy público gratuito do cadastro oficial. CNPJ fictício devolve honestamente `NAO_ENCONTRADO`; falha de rede/limite de requisições devolve `ERRO_CONSULTA`, nunca um resultado forjado.                                    |
| PGFN, DataJud, Portal da Transparência, CENPROT | Simulado       | Determinístico (mesmo CNPJ sempre gera a mesma simulação) — não existe API pública gratuita equivalente. Nunca apresentado como consulta real.                                                                                                                       |
| CPF (pessoa física)                             | Não disponível | Não existe fonte pública e gratuita de dados financeiros de pessoa física no Brasil — dados de CPF (dívidas, protestos) são propriedade de birôs de crédito pagos (Serasa/Boa Vista/Quod) ou protegidos por LGPD. A plataforma nunca simula isso como se fosse real. |
| Google/Microsoft OAuth                          | Real, opcional | Ativado só se as credenciais (`GOOGLE_OAUTH_*`/`MICROSOFT_OAUTH_*`) estiverem configuradas no ambiente.                                                                                                                                                              |
| E-mail (recuperação de senha)                   | Real, opcional | Envia via SMTP se configurado (`SMTP_*`); sem isso, cai em `ConsoleEmailProvider` (loga o e-mail em vez de enviar) — nunca falha silenciosamente.                                                                                                                    |

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

### Primeiro uso

1. Abra o frontend e crie uma conta (o nome da "empresa" informado no cadastro define seu tenant).
2. Vá em **Importações** → baixe a planilha demo (ou o modelo, para preencher com dados reais) → importe.
3. O Dashboard executivo, Casos, Relacionamentos e Consultar CPF/CNPJ passam a mostrar os dados reais dessa importação — nunca de outra conta/empresa.

## Variáveis de ambiente

Ver [`apps/api/.env.example`](apps/api/.env.example) para a lista completa e comentada. Só `DATABASE_URL`, `REDIS_URL` e os segredos JWT são obrigatórios — OAuth, SMTP e demais integrações são opcionais e ficam automaticamente desativados sem as credenciais correspondentes (nunca quebram o boot). A consulta real de CNPJ (BrasilAPI) não exige nenhuma variável nova — é uma API pública sem chave.

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

Helmet, CORS configurável por env, rate limiting (Redis-backed, com limite dedicado e mais estrito para login), request ID + logging estruturado (Pino, com redaction de campos sensíveis — nunca um CPF completo ou senha em log), métricas Prometheus em `/api/v1/metrics`, tratamento centralizado de erros com taxonomia estável (`AppErrorKind`), validação de variáveis de ambiente com fail-fast (Zod), Dockerfiles multi-stage com usuário não-root, autenticação JWT + refresh rotativo com detecção de reuso, RBAC granular por permissão (não por papel hardcoded no código de negócio), isolamento multi-tenant fail-closed (sem registro de propriedade, nenhum tenant acessa).

## Testes

580+ testes unitários (Jest) mais suíte de integração contra Postgres/Redis reais. Cada módulo tem sua própria ADR documentando as decisões de arquitetura e as limitações de escopo conhecidas — nunca escondidas. Ver [`RELATORIO_FINAL.md`](RELATORIO_FINAL.md) para o resumo consolidado do que foi entregue.

## Documentação

- [Visão geral da arquitetura](docs/architecture/overview.md)
- [ADRs](docs/architecture/decisions) — toda decisão de arquitetura relevante, incluindo o que foi deliberadamente deixado de fora e por quê
- [Relatório final do projeto](RELATORIO_FINAL.md) — o que foi implementado, integrações reais vs. simuladas, estatísticas, limitações e próximos passos
