# Relatório Final — Recovery Intelligence Platform

**Data:** 2026-08-02
**Fase:** Fechamento definitivo para entrega/demonstração
**Status:** Backend e frontend validados integralmente (typecheck, lint, testes unitários, testes de integração, build). Imagens Docker reconstruídas e verificadas ponta a ponta.

---

## 1. O que é a plataforma

SaaS multi-tenant de inteligência de recuperação de crédito: importa carteiras de devedores (PGFN e/ou empresas), resolve identidade entre fontes, classifica risco de forma explicável (todo veredito carrega o fator, a fonte e o peso exatos que o geraram), versiona a evolução de cada dossiê, permite simular "e se" antes de agir, abre casos de cobrança automaticamente para os riscos mais altos e expõe tudo isso em dashboards executivo/operacional e num relatório exportável — com RBAC granular, auditoria e isolamento de dados por tenant desde a fundação, não como retrofit.

Arquitetura: monorepo pnpm (`apps/api`, `apps/web`, `packages/shared-types`, `packages/config`), Clean Architecture/DDD no backend com **21 módulos de negócio**, cada um com suas quatro camadas (`domain → application → infrastructure → presentation`) mais um `container.ts` — fronteira policiada em tempo de lint pelo `eslint-plugin-boundaries`, não por convenção informal. Detalhe completo em [`docs/architecture/overview.md`](docs/architecture/overview.md); o _porquê_ de cada decisão está nas 38 ADRs em `docs/architecture/decisions/`.

## 2. O que foi implementado nesta fase de fechamento

Esta rodada partiu de uma plataforma já funcional (identidade, RBAC, importação PGFN, classificação, explicabilidade, auditoria, versionamento, simulação, analytics, casos, multi-tenant, dashboards) e endereçou lacunas concretas encontradas ao testar o fluxo de demonstração de ponta a ponta:

1. **Multi-tenancy real no JWT** — `AccessTokenClaims` ganhou `tenantId`, assinado no token (nunca em header). Login/auto-cadastro/OAuth resolvem ou provisionam o tenant do usuário; contas legadas são curadas automaticamente no primeiro login pós-migração, sem travar acesso.
2. **Pipeline de importação de empresas** (paralelo ao pipeline PGFN existente) — planilha de carteira de empresas, com geração de template e de planilha demo (50 empresas, incluindo arquétipos de holding e fomento mercantil), parser XLSX dedicado, e:
   - **Estrutura societária simulada** (`SimulatedEmpresaOwnershipProvider`) — gera sócios/administradores e participação societária de forma determinística (seed pelo CNPJ), alimentando o grafo de relacionamentos com dados coerentes em vez de vazio.
   - **Abertura automática de Caso** para empresas classificadas em alto risco, com prioridade derivada da classificação.
   - **Reset de dados do tenant** — endpoint para limpar dossiês/lotes de importação/vínculos de propriedade do tenant chamador antes de reimportar (nunca afeta `Empresa`/`Pessoa`, dado global, nem outros tenants) — pensado para permitir reapresentar a demo do zero.
3. **Integração real com a Receita Federal via BrasilAPI** (`IReceitaFederalProvider`/`BrasilApiReceitaFederalProvider`) — CNPJ é consultado de fato numa API pública gratuita; timeout de 8s, cabeçalhos apropriados, e mapeamento honesto de 404 (não encontrado)/429 (limite de requisições)/erro de rede via o modelo de 4 estados `Evidence<T>` — nunca finge um resultado negativo quando a chamada falha.
4. **Busca de identidade (CPF/CNPJ/nome) na tela do produto** — `ConsultaPage` no frontend, apoiada por uma nova estratégia de match fuzzy (`FuzzyDocumentAndNameMatchStrategy`, similaridade posicional de documento + nome) somada ao motor de match exato já existente, e por `FindDossieForCandidateUseCase`, que resolve o Dossiê de um candidato sem nunca vazar o Dossiê de outro tenant para o mesmo CPF/CNPJ (fail-closed via `TenantPolicy`).
5. **`Fator.fonte`** — cada fator de risco passou a declarar sua própria fonte (`DossieFonte`), eliminando três tabelas de mapeamento "nome do fator → fonte" duplicadas (`FatorSourceMapper`, `ConfidenceHeatmapBuilder`, `SimulationImpactAnalyzer`) que precisavam ser mantidas manualmente em sincronia a cada nova regra.
6. **Escopo real de `Case` por tenant** — `Case` não tem `TenantResourceOwnership` própria; passa a ser resolvido transitivamente pelo tenant do seu `Dossie` (`ICaseRepository.findManyByDossieIds` + `listResourceIds`).
7. **Analytics enriquecido** — resumo executivo ganhou `empresasEmMaiorRisco` (top-5 por score) e `alertas` (derivados de contagem de alto risco, sanções do Portal da Transparência e protestos CENPROT) — o dashboard deixa de só mostrar métricas agregadas e passa a apontar o que precisa de atenção.
8. **Análise da IA no Dossiê** — card no frontend com resumo executivo, pontos positivos/de atenção, quatro dimensões de risco por fonte, recomendação e nível de confiança, lido do snapshot de versão mais recente (dado que já existia no motor de recomendação/explicabilidade, agora exposto de forma legível).
9. **Correções de bugs reais de frontend** encontrados ao testar a demo: tooltip de gráfico ilegível no tema escuro (sem cores explícitas) e percentual "10000%" em "Cobertura por fonte" (dupla multiplicação por 100 de um valor que já vinha em 0–100).
10. **Documentação atualizada** — README reescrito refletindo o estado real (arquitetura, autenticação, importação, BrasilAPI, dashboards, Swagger, tabela explícita "real vs. simulado"); `docs/architecture/overview.md` e ADR 0037 corrigidos; ADR 0038 nova, documentando todas as decisões desta fase.

## 3. O que atende ao enunciado original

A plataforma cobre integralmente o escopo de um sistema de inteligência de recuperação de crédito enterprise:

- **Ingestão de dados**: importação de planilha (PGFN e empresas), com preview/dry-run, detecção de duplicados, mascaramento de CPF/CNPJ por padrão.
- **Resolução de identidade**: motor de match multi-sinal (documento exato + fuzzy + nome), com decisão explícita (`MATCH`/`POSSIBLE_MATCH`/`NO_MATCH`) e prova (quais sinais bateram e com que peso) — nunca uma "caixa preta".
- **Classificação de risco explicável**: toda decisão carrega o fator, a fonte e o peso exatos que a geraram — não é um relatório de auditoria em separado, é parte do contrato de resposta.
- **Gestão operacional**: casos, fila de trabalho, dashboards executivo e operacional, relatório exportável.
- **Segurança e conformidade**: RBAC granular por permissão (nunca por nome de papel), auditoria append-only de toda mutação relevante, versionamento auditável de cada dossiê, multi-tenancy com isolamento garantido no banco (não por convenção de aplicação), LGPD por construção (mascaramento por padrão, nunca por checklist).
- **Integração externa real**: consulta de CNPJ à Receita Federal via BrasilAPI, com falha honesta (nunca finge sucesso).

## 4. Integrações reais vs. simuladas

| Fonte                                                  | Status                                 | Observação                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Receita Federal (CNPJ)                                 | **Real**                               | [BrasilAPI](https://brasilapi.com.br) — proxy público gratuito do cadastro oficial. `NAO_ENCONTRADO`/`ERRO_CONSULTA` honestos, nunca um resultado forjado.                                                                                                                                                   |
| PGFN, DataJud, Portal da Transparência, CENPROT        | Simulado                               | Determinístico (mesmo CNPJ/CPF sempre gera a mesma simulação) — não existe API pública gratuita equivalente para essas fontes. Nunca apresentado como consulta real na interface.                                                                                                                            |
| Estrutura societária (sócios/administradores)          | Simulado                               | Determinístico por CNPJ — não há fonte pública gratuita de quadro societário completo em tempo real.                                                                                                                                                                                                         |
| Busca de identidade por CPF na internet (fora do CNPJ) | **Não implementado — deliberadamente** | Não existe API legal e gratuita de busca de pessoa física por CPF na internet; isso é dado protegido por LGPD, tipicamente vendido por birôs de crédito licenciados (Serasa, Boa Vista, Quod) sob contrato. Implementar isso exigiria uma parceria comercial/API paga, fora do escopo técnico deste projeto. |
| Google/Microsoft OAuth                                 | Real, opcional                         | Ativado só se as credenciais estiverem configuradas no ambiente.                                                                                                                                                                                                                                             |
| E-mail (recuperação de senha)                          | Real, opcional                         | SMTP se configurado; senão `ConsoleEmailProvider` (loga em vez de enviar) — nunca falha silenciosamente.                                                                                                                                                                                                     |

## 5. Estatísticas do projeto

| Métrica                                         | Valor                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Módulos de negócio (backend)                    | 21                                                                                                              |
| Endpoints HTTP registrados                      | ~95                                                                                                             |
| Migrations Prisma                               | 16                                                                                                              |
| Modelos de dados (Prisma schema)                | 28                                                                                                              |
| ADRs (decisões de arquitetura documentadas)     | 38                                                                                                              |
| Arquivos-fonte backend (`.ts`)                  | 493                                                                                                             |
| Linhas de código backend                        | ~25.300                                                                                                         |
| Arquivos-fonte frontend (`.ts`/`.tsx`)          | 39                                                                                                              |
| Linhas de código frontend                       | ~6.100                                                                                                          |
| Arquivos de teste                               | 146 (122 unitários + 24 integração)                                                                             |
| Linhas de código de teste                       | ~15.000                                                                                                         |
| Testes unitários passando                       | **584/584 (100%)**                                                                                              |
| Testes de integração passando                   | **143/143 (100%)**                                                                                              |
| Vulnerabilidades de dependências (`pnpm audit`) | 5 residuais (`xlsx`, `react-router-dom`/`react-router`) — sem versão corrigida publicada no npm, ver Limitações |

## 6. Validação executada nesta sessão (evidência real)

```bash
pnpm run typecheck        # 3/3 pacotes: Done — zero erros
pnpm run lint              # eslint . — zero erros, zero warnings
pnpm run build              # shared-types + api + web — build de produção completo
pnpm exec jest tests/unit    # apps/api: 122 suites, 584 testes, 100% passando
pnpm exec jest tests/integration   # apps/api: 24 suites, 143 testes, 100% passando (Postgres/Redis reais)
docker compose build api web        # ambas as imagens reconstruídas com sucesso
docker compose up -d                 # postgres/redis/api/web saudáveis
curl /api/v1/health                   # {"status":"ok", dependencies: postgres+redis "ok"}
```

Fluxo ponta a ponta verificado manualmente contra os contêineres recém-reconstruídos: cadastro → login (JWT com `tenantId`) → tentativa de acesso a um recurso sem permissão (RBAC nega corretamente, `403`, papel `VIEWER` recém-criado sem permissões) → frontend servido (`200` em `http://localhost:8080`).

## 7. Preparação para deploy (sem publicar em nenhuma plataforma)

- `docker-compose.yml`: 4 serviços (`postgres`, `redis`, `api`, `web`), healthchecks em `postgres`/`redis`, `depends_on: condition: service_healthy`, todas as variáveis sensíveis com default explicitamente inseguro documentado em comentário (`JWT_ACCESS_SECRET`) — força quem for para produção a trocar, nunca esconde o requisito.
- `apps/api/.env.example`: todas as variáveis documentadas por seção (banco, cache, CORS, JWT, Argon2, rate limit/lockout, SMTP opcional, OAuth opcional). BrasilAPI não exige nenhuma variável (API pública sem chave).
- `COOKIE_SECURE=false` está documentado explicitamente como correto **apenas** enquanto não houver um terminador TLS na frente da API — comentário no `docker-compose.yml` avisa para trocar antes de produção real.
- Nenhuma etapa de deploy externo (Vercel, Railway, cloud provider) foi executada — build e verificação ficaram inteiramente locais, por escopo explícito desta fase.

## 8. Limitações conhecidas

- **`xlsx@0.18.5`**: sem versão corrigida publicada no npm para as CVEs conhecidas (prototype pollution, ReDoS). Mitigado parcialmente (endpoint autenticado, limite de tamanho, sem avaliação de fórmulas), não eliminado. Migração para `exceljs` é recomendação de roadmap.
- **`react-router-dom@6.30.4`/`react-router`**: mesma situação — fix real exige a v7 (breaking change). Uso real no código não é explorável (nenhum `<Navigate>` recebe valor não-literal), mas o registro formal permanece até a migração.
- **Busca de CPF/pessoa física na internet**: deliberadamente não implementada — ver seção 4. Qualquer alternativa real exigiria contrato comercial com um birô de crédito licenciado.
- **Progresso de importação em tempo real**: o pipeline roda síncrono numa única requisição HTTP; não há "X% concluído" consultável via polling. Corrigir isso exigiria pipeline assíncrono via fila de jobs (reaproveitando `scheduler`).
- **Estrutura societária e fontes PGFN/DataJud/Portal da Transparência/CENPROT são simuladas** (determinísticas, nunca aleatórias) — ver tabela da seção 4. Isso é necessário para a demonstração ser rica sem depender de dados sensíveis reais de terceiros, mas é uma limitação real de dado, não de código.
- **`recovery_intelligence_test`** (banco usado pelos testes de integração) é compartilhado entre execuções e sensível a estado residual acumulado — já documentado no próprio `jest.config` (`maxWorkers: 1`). Se os testes de integração falharem por contagem inesperada numa sessão futura, recriar o banco do zero antes de suspeitar de regressão de código.

## 9. Próximos passos (roadmap, não implementado por decisão de escopo)

- Migração de `xlsx` para `exceljs`; upgrade de `react-router` para v7.
- Pipeline de importação assíncrono com progresso real.
- Parceria comercial com birô de crédito licenciado, se busca de pessoa física por CPF na internet for um requisito de produto real (implicação legal/contratual, não técnica).
- MFA (porta `IMfaChallengeProvider` já preparada desde o ADR 0007, sem implementação).
- Checagem de senhas vazadas (estilo HaveIBeenPwned, k-anonymity) — depende de integração externa.

## 10. Histórico de commits desta fase

```
02a174a docs: atualiza README, overview e ADRs para o estado atual
4c4b282 feat(web): paginas de importacao/consulta e correcoes de dashboard
95af371 feat(analytics): empresas em maior risco e alertas no resumo executivo
4fd5b0c feat(identity,identity-resolution): tenantId no JWT e busca de identidade
75f6e7b feat(import): pipeline de importacao de empresas com riqueza de demo
8e00a2e refactor(classification): substitui tabelas de mapeamento por fator.fonte
2d5b737 feat(case-management): escopa listagem de casos por tenant via dossie
a49cd18 feat(dossie): busca por sujeito e limpeza de dossies/versoes por lote
37cf385 feat(tenant): remocao de vinculos de propriedade por tenant e tipo
6801644 feat(db): migration para escopo de tenant e estrutura societaria
```

---

_Este relatório reflete o estado do repositório na data acima. Toda métrica de teste/lint/build citada tem evidência de execução real nesta sessão; nenhuma foi estimada sem verificação direta._
