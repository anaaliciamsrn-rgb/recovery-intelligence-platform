# 0037 — Multi-tenant real + fluxo "Importar Empresas"

## Status

Aceito e implementado

## Contexto

Até esta fase, o módulo `tenant` (ADR 0028) existia como fundação isolada: `TenantResourceOwnership` estava pronto para uso, mas nenhuma rota o exigia, `resolveTenantMiddleware` resolvia o tenant de um header `X-Tenant-Id` livremente falsificável, e `User` não carregava `tenantId` nenhum. Era, na prática, decorativo — qualquer usuário autenticado via qualquer rota via os dados de qualquer outro.

O pedido desta fase foi explícito: transformar a plataforma num SaaS real onde cada empresa cliente (tenant) só vê os próprios dados, com o fluxo completo Cadastro → Login → Dashboard vazio → Importar planilha → IA processa → Dossiês criados → Dashboard atualizado — nunca dados fictícios automáticos, nunca dados de outro tenant.

## Decisão 1 — Reaproveitar `TenantResourceOwnership`, não adicionar `tenantId` a tabelas existentes

A ADR 0028 documentou deliberadamente: "nenhuma tabela de módulos existentes ganhou `tenantId` — isolamento é aplicado via `TenantResourceOwnership`, uma camada aditiva por cima de qualquer recurso de qualquer módulo." Esta fase honra essa decisão em vez de a contradizer: `User`, `Dossie` e `ImportBatch` continuam sem coluna `tenant_id` própria. Em vez disso:

- `ITenantResourceOwnershipRepository` ganhou `listResourceIds(tenantId, resourceType): Promise<string[]>` — a busca inversa que faltava (só existia `findByResource`, ponto a ponto). O índice `[tenantId, resourceType]` já existia desde a ADR 0028 e cobre exatamente essa consulta.
- Todo caminho que cria um `User`, `Dossie` ou `ImportBatch` agora chama `RegisterTenantResourceUseCase.execute({tenantId, resourceType, resourceId})` depois de persistir — `RegisterUseCase`/`OAuthLoginUseCase` (identity), `DossieController.create` (dossie, endpoint genérico), e o novo `ImportEmpresasSpreadsheetUseCase` (import).
- Toda leitura agregada (`GetAnalyticsSummaryUseCase`, `ListImportBatchesUseCase`) resolve primeiro os `resourceId`s do tenant via `listResourceIds`, depois filtra/busca só esse conjunto.

Vantagem real sobre adicionar `tenantId` direto: zero migração de schema nas tabelas de negócio já aprovadas, zero risco de esquecer de popular a coluna em algum caminho de escrita já existente (o padrão "registre a propriedade depois de salvar" é sempre um passo explícito, nunca um valor default silencioso). Custo aceito: uma consulta extra (`listResourceIds`) antes de cada leitura agregada — irrelevante no volume desta fase.

## Decisão 2 — Tenant no JWT, resolvido por `identity`, nunca por header

`AccessTokenClaims` (shared kernel, `ITokenProvider.ts`) ganhou `tenantId: string`, sempre presente, nunca opcional. `authenticate.middleware.ts` popula `req.auth.tenantId` a partir do claim verificado — a mesma garantia criptográfica que já protegia `roles`/`sub` agora cobre o tenant. O `resolveTenantMiddleware` baseado em header (ADR 0028) continua existindo para compatibilidade mas nenhum código novo o usa; a fonte de verdade passou a ser exclusivamente o JWT.

### Resolução do tenant no autocadastro

`RegisterUseCase` resolve-ou-cria um `Tenant` a partir do campo `empresa` do formulário de cadastro (normalizado via `Tenant.slugify`, novo método estático). Duas pessoas que digitam o mesmo nome de empresa caem no mesmo tenant — é assim que colegas compartilham a mesma carteira. `OAuthLoginUseCase` faz o mesmo, mas sem campo `empresa` disponível no perfil OAuth básico, usa o domínio do e-mail corporativo.

**Exceção deliberada — provedores de e-mail pessoal nunca são chave de tenant compartilhado** (`resolveTenantCandidateName`, novo helper em `identity/application/`): se o domínio do e-mail está numa lista pequena de provedores gratuitos conhecidos (gmail.com, hotmail.com, outlook.com, yahoo.com, icloud.com, uol.com.br, etc.), o candidato a tenant nunca é o domínio — cai num tenant individual (`conta-<userId>`). Sem essa exceção, duas contas completamente não relacionadas que só coincidem de usar Gmail pessoal cairiam no mesmo tenant pelo fallback de domínio, um vazamento real de isolamento entre empresas — exatamente o que esta fase existe para evitar.

### Autocura em vez de recusa (`LoginUseCase`/`RefreshTokenUseCase`/`OAuthLoginUseCase`)

Contas inseridas fora do fluxo de autocadastro (seed, script administrativo, testes de integração que inserem `User` direto via Prisma) não têm `TenantResourceOwnership` nenhum. A primeira versão desta implementação recusava o login nesse caso (`AppError("INTERNAL", ...)`, fail-closed, mesmo espírito de `TenantPolicy.podeAcessar`) — mas isso quebrou ~20 suítes de integração pré-existentes que criam usuários direto no banco antes de logar via HTTP, um padrão legítimo e generalizado no repositório. Em vez de reescrever todas essas suítes, `resolveOrProvisionTenantId` foi adotado: login/refresh/OAuth resolvem-ou-criam um tenant na hora, com a mesma lógica de `RegisterUseCase`, na primeira vez que encontram uma conta sem ownership. Autocura, não trava a conta — e cobre exatamente o mesmo caso de uma conta herdada de antes desta fase.

### Migração de backfill (`20260802130000_add_tenant_scoping_and_import_batch_owner`)

Ainda assim, contas reais já existentes em produção (antes desta fase) ganham um tenant "Legado (pré multi-tenant)" único, criado na própria migração — proativo, em vez de depender da autocura no primeiro login de cada uma. É puramente aditivo: `INSERT ... WHERE NOT EXISTS`, idempotente, seguro reexecutar.

## Decisão 3 — Fluxo "Importar Empresas" (novo, dentro do módulo `import` existente)

Nenhum módulo novo — extensão aditiva de `import` (mesmo módulo do fluxo PGFN já existente), com pipeline e parser próprios por serem um domínio de negócio genuinamente diferente (cadastro de carteira de clientes, não lista de devedores).

**Pipeline** (`ImportEmpresasSpreadsheetUseCase`): parse (`XlsxEmpresasParser`, colunas localizadas por nome de cabeçalho, não posição fixa) → por linha: valida CNPJ (mod-11 real, `party/CNPJ`) e Razão Social obrigatórios → find-or-create `Empresa` (por CNPJ) → `CreateDossieUseCase` (dossie, reaproveitado) → cinco evidências via `IEmpresaEvidenceSimulator` → `RegistrarEvidenciaUseCase` (dossie, reaproveitado) por fonte → `CreateVersionSnapshotUseCase` (dossier-versioning, reaproveitado — é o mesmo mecanismo que já alimenta o dashboard executivo, reexecuta classificação e recomendação internamente) → registra a propriedade do Dossiê e do lote ao tenant do chamador. Uma linha que falha em qualquer etapa não interrompe as demais (mesmo princípio de resiliência do fluxo PGFN, ADR 0019).

**Limitação conhecida, documentada**: reimportar a mesma planilha cria novos Dossiês para as mesmas Empresas — não há deduplicação entre lotes (diferente do fluxo PGFN). Aceitável para esta fase porque o fluxo principal é "importar uma vez, ver o dashboard preenchido", não reconciliação incremental.

### "IA de demonstração" (`SimulatedEmpresaEvidenceProvider`)

Como nenhuma integração real com PGFN/DataJud/Receita Federal/Portal da Transparência/CENPROT existe (ADR 0015), as cinco evidências são geradas por um simulador determinístico (PRNG semeado pelo CNPJ — reimportar a mesma empresa produz sempre a mesma simulação, mas duas empresas diferentes produzem simulações diferentes). Nunca finge ser uma integração real: é uma porta própria (`IEmpresaEvidenceSimulator`), nunca importada por nenhuma tela sem essa distinção ficar clara.

Probabilidades escolhidas para produzir uma carteira com risco **variado** (nunca tudo igual, o que denunciaria a simulação): ~32% de chance de pendência PGFN, ~28% de processo judicial, situação cadastral 85% ATIVA/15% irregular, Portal da Transparência e CENPROT majoritariamente `NAO_ENCONTRADO` (a maioria das empresas reais não tem sanção/protesto) com uma pequena chance de `ERRO_CONSULTA` simulado no CENPROT (~4% — uma fonte real falha ocasionalmente; 100% de sucesso o tempo todo pareceria artificial).

### Planilha-modelo e demo (`EmpresaSpreadsheetTemplateGenerator`)

Gerados via `xlsx` (mesma biblioteca já usada pelo parser PGFN, ADR 0035 — evita nova dependência e nova instância do risco já documentado e aceito). CNPJs fictícios mas com dígitos verificadores válidos (mesmo algoritmo mod-11 de `party/CNPJ`, para passar a validação real). **As 30 empresas da planilha demo são inteiramente originais e fictícias** — inspiradas só na estrutura de uma carteira real (variedade de setor: indústria/comércio/serviços/tecnologia/saúde/logística/educação; variedade de estado brasileiro), nunca copiadas de nenhuma fonte de terceiros, conforme instrução explícita do usuário.

Servidos via dois use cases (`GenerateEmpresasTemplateUseCase`/`GenerateEmpresasDemoUseCase`) atrás de uma porta (`IEmpresaSpreadsheetTemplateProvider`) — `presentation` nunca importa a implementação `xlsx` diretamente (mesmo padrão de `IMetricsProvider`, ADR 0035; `eslint-plugin-boundaries` reprova a dependência direta).

## Decisão 4 — Analytics tenant-scoped, nunca dados fictícios por padrão

`GetAnalyticsSummaryUseCase` não recebe mais `IPessoaRepository`/`IEmpresaRepository`/`IImportBatchRepository` diretamente — resolve `dossieIds`/`importBatchIds` do tenant via `listResourceIds`, busca só esses Dossiês (`IDossieRepository.findManyByIds`, novo) e filtra os `VersionSnapshot`s por esse conjunto antes de agregar. Um tenant novo, sem nenhuma importação, recebe um `AnalyticsSummary` inteiramente zerado — nunca dados de outro tenant, nunca dados fictícios preenchidos automaticamente. O frontend (`ExecutiveDashboardPage`) interpreta `totalDossiesAnalisados === 0` como o estado vazio explícito pedido: "Você ainda não possui empresas cadastradas. Clique em 'Importar planilha' para começar."

`ListImportBatchesUseCase` ganhou o mesmo tratamento — filtro e paginação em memória sobre `findAll()` já tenant-filtrado (mesma ressalva de escala já aceita para `findAll()` em outros módulos, ADR 0019, irrelevante no volume desta fase).

## Verificação end-to-end (curl, sem Playwright/Browser — proibido nesta fase)

Duas contas reais registradas com nomes de empresa diferentes → tenants distintos confirmados via JWT decodificado. Uma delas importou a planilha demo (30 empresas): `POST /imports/empresas` devolveu `{"totalLinhas":30,"contagens":{"importadas":30,"erros":0},"dossiesCriados":30}`. `GET /analytics/summary` da mesma conta mostrou `totalEmpresas: 30`, distribuição de risco real e variada (17 médio, 11 baixo, 2 alto). A **outra** conta, no mesmo instante, viu `totalEmpresas: 0` e `GET /imports` vazio — isolamento confirmado na API real, não só em teste automatizado.

## Consequências

- Nenhuma migração de schema em `users`, `dossies` ou `import_batches` para tenant (só a coluna aditiva `iniciado_por_usuario_id` em `import_batches`, para "Importado por").
- `AccessTokenClaims.tenantId` é um campo novo, obrigatório — qualquer código que assinava um JWT manualmente (nenhum encontrado fora do já corrigido) quebraria em tempo de compilação, não em runtime.
- **Fora de escopo, explicitamente deferido nesta fase**: `GET /dossies/:id` ainda não é tenant-scoped (registrado como limitação conhecida). A listagem de `case-management` foi corrigida na ADR 0038 (tenant-scoped transitivamente via `dossieId`, sem precisar de `TenantResourceOwnership` própria para `Case`).
- 569 → 712 testes (unitários + integração) passam, incluindo os cenários de autocadastro-mesmo-tenant, autocura sem tenant, e importação/isolamento de carteira.
