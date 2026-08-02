# 0034 — Import Excel Enterprise

## Status

Aceito e implementado — **extensão puramente aditiva sobre o módulo `import` já aprovado** (ADR 0019)

## Contexto

Décima quinta e última etapa do lote contínuo (5–15). O pedido: importador profissional com validação completa, preview antes do import, detecção de duplicados, relatório de erros, rollback, resumo estatístico, histórico de importações, status, progresso, lotes, tudo auditável — e a restrição de LGPD explícita: nunca CPF/dado pessoal completo em logs, testes, documentação ou respostas; sempre mascarar dados sensíveis.

Antes de implementar, o módulo `import` (ADR 0019) foi auditado item a item contra este requisito. Já existiam: validação completa por linha, detecção de duplicados (em lote e entre lotes, por `documentoMascarado`), relatório de erros por linha (`GetImportReportUseCase`), resumo estatístico (`ImportBatch.contagens`), e o próprio conceito de lote (`ImportBatch`). **Não existiam**: preview/dry-run antes de persistir, rollback de um lote já concluído, e histórico (listagem) de lotes. Essa auditoria definiu exatamente o que esta etapa deveria adicionar — nada além disso.

## Decisão — extensão aditiva, zero alteração de comportamento aprovado

Nenhum destes arquivos teve seu comportamento existente alterado (só receberam adições): `ImportPgfnSpreadsheetUseCase`, `ResolveImportRowIdentityUseCase`, `ImportRow`, `ImportRowStatus`, `GetImportDashboardUseCase`, `GetImportReportUseCase`, `XlsxPgfnParser`. A prova disso é mecânica: a suíte de testes pré-existente do módulo (`ImportPgfnSpreadsheetUseCase.test.ts`, `GetImportReportUseCase.test.ts`, etc.) passa sem nenhuma modificação de asserção — só precisou de dois literais de teste ganharem os três novos campos obrigatórios de `ImportBatchProps` (mecânico, não comportamental — mesmo padrão já usado nas Etapas 6/10 ao estender interfaces existentes).

### Preview / dry-run (`POST /imports/preview`)

`PreviewImportSpreadsheetUseCase` — implementação **independente** (não chama métodos privados do use case aprovado, mesma disciplina de duplicação deliberada do resto da plataforma) que roda exatamente as mesmas validações linha a linha (campos obrigatórios, formato do documento mascarado, valores monetários, duplicidade em lote e contra lotes anteriores via leitura em `IImportRowRepository.findByDocumentoMascarado`, já existente) e devolve o resultado — **sem persistir nada**: nenhum `ImportBatch`/`ImportRow` é criado. Testado explicitamente (`totalBatchesAntes === totalBatchesDepois` no teste de integração).

### Rollback (`POST /imports/:id/rollback`)

`ImportBatch` ganhou `status` (`CONCLUIDO | REVERTIDO`), `revertidoEm`, `motivoReversao` e o método `reverter(motivo, now)`. **Reversão lógica, nunca física**: nenhuma `ImportRow` é apagada — auditabilidade total é preservada. `RollbackImportBatchUseCase` (novo) chama esse método e persiste. Reverter um lote já revertido lança `CONFLICT` (409).

### Histórico de importações (`GET /imports`)

`IImportBatchRepository` ganhou `findAll()` (mesmo padrão aditivo de `count()`, já adicionado na Etapa 6). `ListImportBatchesUseCase` (novo) devolve todos os lotes, mais recentes primeiro.

### Status e "progresso"

`ImportBatch.status` agora existe e é exposto em todo lugar que devolve um lote (criação, histórico, rollback). **Limitação registrada, não escondida**: o pipeline de importação (`ImportPgfnSpreadsheetUseCase` + `ResolveImportRowIdentityUseCase`) roda inteiramente síncrono dentro de uma única requisição HTTP — não há um estado real "em andamento" que um cliente possa consultar via polling, porque o lote só passa a existir depois que o processamento já terminou. Introduzir progresso percentual de fato exigiria tornar o pipeline assíncrono (fila de jobs, ex.: reaproveitando o `scheduler` da Etapa 13) — uma mudança de comportamento do fluxo síncrono hoje aprovado, fora do escopo de "só adicionar" desta etapa. Documentado como backlog.

## LGPD — nada muda, porque nada precisava mudar

Nenhuma linha de código nesta etapa lê, computa ou armazena um CPF/CNPJ completo. `PreviewImportSpreadsheetUseCase` opera exclusivamente sobre `DocumentoMascarado` (VO já existente, ADR 0019) — o mesmo VO que rejeita qualquer coisa que não seja o formato `***.NNN.NNN-**`. As respostas de preview/histórico/rollback só expõem `nome` (já exposto hoje por `GetImportReportUseCase`, comportamento pré-aprovado, não uma exposição nova) e o documento mascarado. Testes de integração usam CPF sintético gerado por script (checksum válido, nunca um CPF real) só para produzir o documento mascarado de teste — nunca um CPF completo aparece em nenhum teste, log, fixture ou resposta desta etapa.

## Consequências

- Migration `extend_import_batch_lifecycle`: `ImportBatch` ganha `status` (enum `ImportBatchStatus`, default `CONCLUIDO` — lotes existentes continuam válidos sem nenhuma ação), `revertidoEm`, `motivoReversao`.
- Endpoints novos: `POST /imports/preview`, `GET /imports` (histórico), `POST /imports/:id/rollback`.
- Backlog explícito: progresso percentual real exigiria tornar o pipeline de importação assíncrono — decisão de produto separada, não implementada aqui. Rollback não desfaz `Pessoa`/`Dossiê` eventualmente criados por `ResolveImportRowIdentityUseCase` nem recalcula deduplicação de lotes futuros — documentado no próprio código (`ImportBatch.reverter`).
