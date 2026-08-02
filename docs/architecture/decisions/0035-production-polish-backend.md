# 0035 — Polimento de produção: paginação, OpenAPI, observabilidade e segurança

## Status

Aceito e implementado — fase de polimento final, sem novos módulos de negócio

## Contexto

Com os 21 módulos de negócio completos (ADRs 0001–0034), o pedido desta fase foi explícito: **não criar módulos novos**, apenas elevar o que já existe a nível de produto comercial. Esta ADR cobre as decisões de backend dessa fase; a ADR 0036 cobre o frontend.

## Paginação nos endpoints de listagem sem limite

`rule-builder`, `feature-flags`, `scheduler` e `import` tinham `findAll()`/listagens sem paginação — um `GET /rules` numa base com milhares de regras devolveria tudo de uma vez. Cada módulo ganhou um `findMany(filter, pagination): Promise<{ items, total, page, pageSize }>` **aditivo**, no mesmo formato de página já usado por `case-management` desde a Etapa 7 — nenhum endpoint mudou de formato de resposta de forma incompatível para clientes que já paginavam. `findAll`/`findDue` originais foram mantidos onde ainda há uso interno não-paginado (ex.: `EvaluateRulesUseCase` precisa de todas as regras ativas; `SchedulerWorker` precisa de todos os jobs vencidos).

## OpenAPI / Swagger

`presentation/http/openapi/openapi-document.ts` — documento OpenAPI 3.0.3 escrito à mão como objeto TypeScript (não gerado a partir dos schemas Zod), cobrindo os ~95 endpoints de todos os módulos. Servido em `GET /api/v1/docs` (Swagger UI) e `GET /api/v1/openapi.json` (raw), ambos públicos — é documentação da forma da API, não um dado sensível.

**Achado de segurança durante a implementação**: o CSP global (`securityHeadersMiddleware`, `helmet` com `script-src 'self'`, sem `unsafe-inline`) bloquearia o `<script>` inline que o próprio `swagger-ui-express` injeta para inicializar a UI — a página de docs renderizaria em branco num navegador real, apesar de compilar sem erros. Corrigido com um CSP dedicado, mais permissivo, montado **apenas** na rota `/docs` (`openapi.routes.ts`), em vez de afrouxar o CSP do resto da API.

## Observabilidade: métricas Prometheus

`PrometheusMetricsProvider` (infrastructure) — `Registry` própria (nunca o registro global do `prom-client`, para não colidir entre arquivos de teste), `Counter http_requests_total` e `Histogram http_request_duration_seconds`, ambos rotulados por `method`/`route`/`status_code`. `route` é sempre o **padrão** da rota (`req.route.path` prefixado por `req.baseUrl`), nunca a URL crua — o objetivo é cardinalidade limitada; uma URL com ID real criaria uma série nova por requisição.

**Port em vez de import direto de infraestrutura**: `metricsMiddleware`, `createMetricsRouter` e `app.ts` (presentation) inicialmente importavam `PrometheusMetricsProvider` (infrastructure) diretamente — violação do `eslint-plugin-boundaries` (presentation não pode depender de infrastructure, só de application/domain). Corrigido com `IMetricsProvider` em `application/ports/`, implementado por `PrometheusMetricsProvider`, seguindo exatamente o mesmo padrão já usado por `ILogger`. Exposto em `GET /api/v1/metrics`, sem autenticação — é assim que um scraper Prometheus funciona.

## Segurança: auditoria de dependências

`pnpm audit` encontrou 17 vulnerabilidades. Duas classes de causa raiz identificadas e corrigidas na configuração do próprio pnpm, não no código:

1. `pnpm-workspace.yaml` tinha `allowBuilds."@scarf/scarf"` com o valor literal `"set this to true ou false"` — um placeholder nunca preenchido, não `true`/`false` — fazendo toda instalação emitir `[ERR_PNPM_IGNORED_BUILDS]`. Corrigido para `false` (scarf é só telemetria de instalação de um pacote transitivo, seguro desabilitar).
2. `"pnpm": { "neverBuiltDependencies": [...] }` em `package.json` (raiz) não é mais lido pelas versões atuais do pnpm — a chave equivalente migrou para `pnpm-workspace.yaml`. Removida do `package.json`, já coberta pelo `allowBuilds` acima.

Das 17 vulnerabilidades: `handlebars@4.7.8` (transitivo via `eslint-plugin-boundaries`, ferramenta de lint, nunca roda em produção) tinha um crítico e vários altos — corrigido via `pnpm-workspace.yaml`'s `overrides: { handlebars: ">=4.7.9" }`. `vite@5.4.21` e `esbuild` tinham um alto (bypass de `server.fs.deny` no Windows — relevante, já que o ambiente de desenvolvimento é Windows) — corrigido com upgrade para `vite@^6.4.3` (compatibilidade de peer dependencies já confirmada com `@vitejs/plugin-react` e `@tailwindcss/vite` instalados).

**Duas vulnerabilidades aceitas como risco residual, documentadas em vez de escondidas**, porque não existe versão corrigida publicada no registro do npm para a linha instalada:

- `xlsx@0.18.5` (dependência direta de `import`, usado só para `XLSX.read()` + `sheet_to_json()`, nunca avaliação de fórmulas): o SheetJS não publica mais versões corrigidas (>=0.19.3/>=0.20.2) no npm, só via seu próprio CDN. Mitigação parcial: o endpoint de import exige autenticação, tem limite de tamanho de arquivo, e o parsing roda sobre um buffer isolado sem escrita em disco. Migração para outra biblioteca (ex. `exceljs`) é um item de roadmap, não desta fase (reescrever o parser é mudança estrutural, não polimento).
- `react-router-dom@6.30.4` (mais recente publicado na linha 6.x — a versão corrigida `6.30.5` citada pelo advisory nunca foi publicada no npm; o fix real está só na v7, uma major breaking change): auditado o uso real de `<Navigate to=...>` no código — todas as três ocorrências (`App.tsx`, `ProtectedRoute.tsx`, `LoginPage.tsx`) usam strings literais fixas (`"/"`, `"/login"`, `"/app"`), nunca um valor vindo de input do usuário ou da URL — o vetor de "open redirect" do advisory não é explorável neste código.

## Consequências

- Nenhum endpoint existente teve seu contrato quebrado.
- `pnpm audit` cai de 17 para 5 vulnerabilidades, as 5 restantes documentadas como risco aceito com justificativa técnica, não silenciadas.
- Novo port `application/ports/IMetricsProvider.ts` — mesma disciplina arquitetural do resto da plataforma.
