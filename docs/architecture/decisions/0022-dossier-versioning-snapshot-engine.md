# 0022 — Dossier Versioning / Snapshot Engine

## Status

Aceito e implementado

## Contexto

Terceira etapa da evolução enterprise. Hoje o Dossiê (ADR 0015) tem só `createdAt`/`updatedAt` — nenhum histórico do que ele já foi. O requisito era transformá-lo num objeto completamente auditável no tempo: cada mudança de evidência deve gerar uma versão imutável, congelando evidências, classificação, fatores, recomendações, prompt e scores daquele instante, com hash de integridade, consultável e comparável.

Restrição dura: nenhuma funcionalidade existente pode ser alterada; este módulo só observa `dossie`.

## Decisão

### Novo módulo `modules/dossier-versioning`, mesma Clean Architecture

`domain/application/infrastructure/presentation/container.ts`, seguindo o mesmo padrão de todo o projeto. Nome do mount point em inglês (`/api/v1/dossiers`), deliberadamente distinto de `/api/v1/dossies` (o módulo `dossie` em si) — mesma decisão já tomada na Etapa 1 (`/api/v1/classification` vs. `/api/v1/classificacoes`): um path novo e não ambíguo, sem precisar tocar no router existente.

### Mesma técnica de observação da Etapa 2 (Audit Trail), middleware independente

`createVersionSnapshotMiddleware` reaproveita a técnica já validada em `auditTrail.middleware.ts` (ADR 0021): monkey-patch de `res.json`/`res.send`, checagem em `res.on("finish")` contra uma tabela fechada de rotas (`VERSIONABLE_ROUTES`), execução assíncrona (fire-and-forget) que nunca bloqueia nem altera a resposta real, falha só logada. Deliberadamente **não** foi feita nenhuma tentativa de unificar os dois middlewares num mecanismo genérico compartilhado — mesmo raciocínio da Etapa 2: esta etapa não deve "fazer refactoring em módulos já aprovados", e os middlewares anteriores (Etapa 1 e 2) já são aprovados. Duplicar a técnica é consistente com a cultura já estabelecida do projeto (ADRs 0010–0021: duplicação deliberada entre módulos, nunca abstração prematura).

### Duas rotas geram versão: criação do Dossiê (versão 1) e atualização de Evidência (versão N+1)

O requisito dizia "sempre que uma evidência mudar". Interpretei isso como incluindo a criação do Dossiê, que estabelece a versão 1 — a linha de base vazia (todas as evidências `NAO_CONSULTADO`) contra a qual a primeira mudança real de evidência é comparável. Sem essa linha de base, a primeira atualização não teria nada para diferenciar, e `GET /dossiers/:id/diff/1/2` só passaria a fazer sentido a partir da segunda atualização.

### `SnapshotContent`: composição sobre os use cases existentes, zero duplicação de lógica

`SnapshotBuilder` (application/services) reexecuta `ClassificarDossieUseCase` → `GerarRecomendacoesUseCase` → `BuildPromptUseCase` — exatamente o mesmo padrão de composição de `GetClassificationExplanationUseCase` (ADR 0020). Nenhuma regra de classificação/recomendação/prompt foi reimplementada. `SnapshotContent` é plano e já serializado, mesma decisão de `PromptContext` (ADR 0018): a fronteira de um snapshot é de armazenamento/saída, não precisa expor os tipos de domínio de `dossie`/`classification`/`recommendation`/`prompt-builder`.

### `SnapshotHashService`: hash SHA-256 do conteúdo, não da versão

O hash cobre `SnapshotContent` (evidências + classificação + fatores + recomendações + prompt + scores) — nunca `id`/`versao`/`timestamp`/`usuarioId`. Dois conteúdos idênticos em versões diferentes devem produzir o mesmo hash, porque o hash responde "o que é", não "quando/quem". Canonicalização recursiva das chaves garante que a mesma informação sempre produz a mesma string, independente da ordem de inserção. É um serviço de domínio puro (sem I/O real, mesmo usando `node:crypto`) — mesma classe de decisão já registrada para outros serviços de domínio puramente computacionais do projeto (`ClassificacaoRiscoScorer`, `IdentityMatchScorer`).

### `VersionDiffService`: só o que mudou, nunca o estado completo repetido

Evidência é classificada como `ADICIONADA` (saiu de `NAO_CONSULTADO`), `REMOVIDA` (voltou a `NAO_CONSULTADO` — estruturalmente inalcançável hoje via `Dossie.atualizarEvidencia`, mas calculada de forma honesta, não descartada por suposição) ou `ALTERADA` (mudou de conteúdo). Fatores e recomendações seguem a mesma lógica, comparados por `nome`/`canal`. Entradas `INALTERADA` nunca aparecem na resposta — a API responde diretamente "o que mudou".

### `TimelineVersionBuilder`: resumo humano só para a visão de lista

`GET /dossiers/:id/history` devolve entradas leves (versão, timestamp, usuário, hash, resumo em texto) — nunca o conteúdo completo de cada versão, que fica reservado para `GET /dossiers/:id/history/:version`. A versão 1 nunca tem resumo (não há versão anterior). Os resumos são geração de texto simples a partir do `VersionDiff` estruturado — a mesma fonte de dados de `GET /diff/:v1/:v2`, nunca uma segunda lógica de comparação.

### Armazenamento com integridade e sem sobrescrita

`VersionSnapshot(dossieId, versao)` tem `@@unique` no Prisma — impede duas linhas com o mesmo par. `save()` só faz `create`, nunca `update`; não existe nenhum método de mutação na entidade de domínio. `findLatestVersionNumber` decide a próxima versão via `max(versao) + 1`.

## Consequências

- **Race condition conhecida e aceita**: duas atualizações de evidência verdadeiramente concorrentes sobre o mesmo Dossiê podem, em teoria, ler o mesmo `max(versao)` antes de qualquer uma escrever, e uma das duas chamadas de `save()` falhará contra a constraint `@@unique`. Como a criação de versão é fire-and-forget (nunca bloqueia a resposta real), essa falha é só logada — o Dossiê continua correto, só a versão daquela mudança específica não fica registrada. Aceitável no volume atual do projeto; resolver de verdade exigiria uma transação com lock ou uma sequência atômica no banco — não implementado aqui.
- Assim como na Etapa 2, os testes de integração de sprints anteriores que criam Dossiê/registram Evidência agora também disparam a criação de versões — o mesmo efeito colateral já documentado no ADR 0021 (linhas órfãs em bases de dev que os `afterAll` mais antigos não limpam). Mesma decisão: não alterar arquivos de sprints aprovadas para corrigir isso agora.
- `GET /dossiers/:id/history/:version` e `GET /dossiers/:id/diff/:v1/:v2` não verificam se o Dossiê em si existe — só se a versão existe. Um `dossieId` totalmente inventado sem nenhuma versão já produz 404 naturalmente (nenhuma linha bate), então o comportamento observável é o mesmo; documentado aqui para deixar claro que não é uma checagem de existência do Dossiê, é uma checagem de existência da versão.
