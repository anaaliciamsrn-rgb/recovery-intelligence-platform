# 0023 — Simulation & Decision Lab (What-if Analysis)

## Status

Aceito e implementado

## Contexto

Quarta etapa da evolução enterprise. Até aqui o sistema só sabe classificar o estado real de um Dossiê. O requisito era permitir perguntas hipotéticas ("e se a PGFN fosse quitada?", "e se a confiança aumentasse?") sem nunca tocar o Dossiê real nem o banco — um "laboratório de decisão" inteiramente em memória.

Restrição dura: nenhum módulo existente pode ser alterado; nada pode ser persistido.

## Decisão

### Novo módulo `modules/simulation`, mesma Clean Architecture — mas sem persistência nenhuma

`domain/application/infrastructure/presentation/container.ts`, seguindo o mesmo padrão de todo o projeto. **Não há migration nesta etapa** — não existe nenhum model Prisma novo, porque o requisito é explícito: a simulação nunca persiste nada, nem por acidente. Justificativa de ausência registrada aqui, não omitida.

### Duplicar o Dossiê em memória via `Dossie.create()`, nunca via `IDossieRepository.save()`

`RunSimulationUseCase` carrega o Dossiê real só para leitura (`IDossieRepository.findById`), nunca chama `save()`. O "Dossiê hipotético" é construído chamando `Dossie.create({...dossieReal.toProps(), evidencias: evidenciasModificadas})` — a mesma entidade de domínio de `dossie` (ADR 0015), sem nenhuma modificação nela, só usada como estava desenhada (um construtor puro que aceita props).

### Reaproveitar `ClassificarDossieUseCase` sem modificação, via `InMemoryDossieRepository`

Em vez de duplicar a lógica das regras de classificação, um adapter `InMemoryDossieRepository` (implementa `IDossieRepository`, `findById` devolve o Dossiê hipotético em memória, `save` é um no-op deliberado) permite instanciar `new ClassificarDossieUseCase(inMemoryRepo, rules)` com as **mesmas classes de regra reais** (`PendenciaFiscalPgfnRule` etc.), sem tocar em nenhum código de `classification`. Essa é a peça central do desenho: zero duplicação da lógica de regras, 100% de reaproveitamento por composição.

### Por que a recomendação e o prompt são recompostos aqui, e não via `GerarRecomendacoesUseCase`/`BuildPromptUseCase`

O requisito pede mudanças hipotéticas de **classificação e confiança diretas** ("trocar classificação", "alterar confiança"), não só de evidência. Mas `GerarRecomendacoesUseCase` e `BuildPromptUseCase` sempre recalculam a classificação por conta própria, internamente — não aceitam um resultado de classificação já sobrescrito. Para que um `CLASSIFICACAO_OVERRIDE`/`CONFIANCA_OVERRIDE` realmente se propague até a recomendação e o prompt exibidos, `RunSimulationUseCase` avalia as regras de recomendação (`IRecommendationRule[]`, as mesmas classes reais, mesmo fallback de `COBRANCA_AMIGAVEL` do ADR 0017) diretamente sobre o resultado (possivelmente sobrescrito), e monta o `PromptContext` manualmente para chamar `PromptBuilder.toStructuredJson`/`toTextPrompt` (funções puras, reaproveitadas sem alteração). O único código verdadeiramente novo aqui é a orquestração; nenhuma regra de classificação, recomendação ou formatação de prompt foi reimplementada.

### `IInMemoryDossieRepositoryFactory`: por que existe uma fábrica em vez do use case construir o adapter direto

A primeira versão deste módulo tinha `RunSimulationUseCase` (application) importando `InMemoryDossieRepository` (infrastructure) diretamente — violação de fronteira detectada pelo próprio lint de arquitetura do projeto (`eslint-plugin-boundaries`, ADR 0009): a application layer não pode depender de infrastructure. A correção foi inverter a dependência com uma fábrica (`IInMemoryDossieRepositoryFactory`, port em application; `InMemoryDossieRepositoryFactory`, implementação em infrastructure) — o use case pede "um repositório para este Dossiê hipotético" sem conhecer a classe concreta. O lint pegou isso automaticamente antes de qualquer teste rodar, exatamente como o ADR 0009 promete.

### `CLASSIFICACAO_OVERRIDE`/`CONFIANCA_OVERRIDE`: sobrescrita literal, divergência exposta, não escondida

Sobrescrever a classe de risco não recalcula um score numérico "compatível" com aquela classe — o score computado a partir da evidência real permanece como estava, e a divergência entre os dois (ex.: classe forçada `ALTO_RISCO` com um score baixo) é uma informação honesta, não escondida. Inventar um score artificial "combinando" com a classe forçada seria fabricar um número sem base — o mesmo princípio de "nada inferido, tudo aponta para um dado real" já seguido em `explainability` (ADR 0020) e `dossier-versioning` (ADR 0022).

### `SimulationChangeApplier` também suporta "REMOVER" — algo que o sistema real não permite

`RegistrarEvidenciaUseCase` (dossie) nunca oferece um caminho para voltar uma evidência a `NAO_CONSULTADO` depois de consultada — é uma limitação de design real do sistema (ver ADR 0022, seção de evidência "removida" estruturalmente inalcançável). A simulação, sendo hipotética e nunca persistida, pode simular exatamente esse cenário ("e se a PGFN nunca tivesse sido consultada / a pendência tivesse sido resolvida?") sem violar nenhuma invariante do sistema real.

### `SimulationImpactAnalyzer`/`SimulationSummaryBuilder`: determinístico, nunca IA

Ambos são funções puras de template sobre os dados já computados (`antes`/`depois`) — nenhuma chamada a modelo de linguagem, nenhuma heurística probabilística. A tabela fonte→regra usada por `SimulationImpactAnalyzer` duplica deliberadamente a mesma tabela de 3 linhas já vista em `FatorSourceMapper` (explainability, ADR 0020) — `simulation` não deveria depender de `explainability` (módulo-etapa irmão) só por isso; mesmo raciocínio já aplicado em `dossier-versioning` (ADR 0022) para não depender de `VersionDiffService`.

### Atribuição de impacto por mudança é uma simplificação assumida

Quando várias mudanças são aplicadas juntas, `afetouClassificacao`/`afetouConfianca`/`afetouRecomendacao` em cada entrada de `SimulationImpactEntry` refletem o resultado **global** (o antes/depois inteiro), repetido por entrada — não uma atribuição isolada de causalidade por mudança individual (que exigiria reexecutar o motor uma vez por mudança, isoladamente, para medir sua contribuição marginal). `afetouRisco`, no caso de mudanças de evidência, é a única atribuição verdadeiramente por-mudança (compara o fator específico daquela fonte). Simplificação assumida e documentada, não escondida.

## Consequências

- Sem migration, sem tabela nova — o módulo é auditável por inspeção de código: se um dia `RunSimulationUseCase` ganhar uma chamada a `.save()` em qualquer repositório real, isso quebra a garantia central desta etapa. Vale um teste de integração futuro que monitore o número de linhas nas tabelas relevantes antes/depois de uma simulação (o teste desta etapa já verifica isso indiretamente, buscando o Dossiê real depois da simulação e confirmando que a evidência não mudou).
- `POST /api/v1/simulation` não observa nem é observado pelos middlewares de Audit Trail (ADR 0021) ou Dossier Versioning (ADR 0022) — não está em `AUDITABLE_ROUTES` nem em `VERSIONABLE_ROUTES`, de propósito: simular não é uma ação de negócio a auditar/versionar, é uma consulta hipotética.
- Backlog: atribuição de impacto por mudança individual (ver seção acima) fica registrada como possível evolução futura, não implementada por ser desproporcional ao pedido desta etapa.
