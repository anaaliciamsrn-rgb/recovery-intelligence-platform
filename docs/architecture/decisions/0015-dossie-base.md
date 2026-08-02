# 0015 — Dossiê Base

## Status

Aceito e implementado

## Contexto

Primeiro consumidor real do Evidence Model ([ADR 0014](0014-evidence-model.md)). O Dossiê é o perfil consultável de uma Pessoa ou Empresa, agregando evidências de até cinco fontes externas previstas (PGFN, DataJud, Receita Federal, Portal da Transparência, CENPROT) — nenhuma integrada nesta sprint.

## Decisão

### Novo módulo `dossie`, um slot nomeado por fonte

`Dossie.evidencias` tem cinco campos fixos (`pgfn`, `dataJud`, `receitaFederal`, `portalTransparencia`, `cenprot`), cada um um `Evidence<unknown>` — não uma lista dinâmica de evidências. Isso reflete que as cinco fontes são conhecidas de antemão (mesmo enum `DossieFonte`, específico deste módulo — não reaproveita `IdentitySourceType` de `identity-resolution`, que inclui `INTERNAL` e serve a um propósito diferente).

### `criarVazio()` — todas as evidências `NAO_CONSULTADO` desde o nascimento

Um dossiê nasce com as cinco evidências em `NAO_CONSULTADO` — nunca `null`/`undefined`. Isso é o Evidence Model sendo levado a sério: "não consultado" é um estado de primeira classe, não a ausência de dado.

### `atualizarEvidencia()` — ponto de extensão, não implementação

O método existe e é usado pelo endpoint `POST /dossies/:id/evidencias`, mas nenhuma chamada real a PGFN/DataJud/Receita/Portal da Transparência/CENPROT foi implementada. O endpoint aceita o resultado de uma consulta (já resolvida em `Evidence`) e só grava — é o mesmo ponto que um worker/job de integração futura vai chamar depois de bater na API externa de verdade. Mesmo padrão do `IMfaChallengeProvider` (ADR 0007): a extensão existe, a implementação não.

### `subjectId` sem `@relation` polimórfica

Um dossiê pode ser de uma `Pessoa` ou de uma `Empresa`. Prisma não tem relação polimórfica nativa (uma FK não pode apontar condicionalmente para duas tabelas diferentes) — `subjectId` é uma referência solta (`String`, sem `@relation`), e a integridade é responsabilidade de `CreateDossieUseCase` (valida existência via `IPessoaRepository`/`IEmpresaRepository` antes de criar), não do banco.

### Evidências persistidas como JSON, não como colunas

`Evidence<T>` é uma union discriminada — seu formato varia por `status` (campos presentes diferem entre `ENCONTRADO`, `NAO_ENCONTRADO`, `NAO_CONSULTADO`, `ERRO_CONSULTA`). Modelar isso como colunas relacionais fixas exigiria uma coluna por campo possível de qualquer status, com a maioria sempre `null` — o oposto do que o Evidence Model tenta evitar (campos nullable confundindo estados). Cada evidência é uma coluna `Json`, com um serializer dedicado (`evidenceSerializer.ts`) que é o único lugar que sabe converter entre o tipo de domínio e o JSON armazenado.

## Consequências

- O Score/Rule Engine (Sprint 7) lê `Dossie.evidencias` como sua principal fonte de fatos — nenhum novo conceito de "dados de entrada" deveria ser inventado ali.
- Integrar uma fonte real no futuro é: implementar o cliente HTTP da fonte, mapear a resposta para `Evidence<T>`, e chamar `RegistrarEvidenciaUseCase` — nenhuma mudança em `Dossie` nem no schema.
- Encontrado durante esta sprint: dois arquivos de integration test (`identity-resolution-flow` e o novo `dossie-flow`) usavam o mesmo CPF fixo para uma Pessoa persistida, causando colisão de unique constraint e um teste apagando o dado do outro sob execução paralela do Jest — corrigido usando um CPF distinto por arquivo. Não é um problema de arquitetura, é um cuidado de fixtures em testes de integração que rodam contra um banco real compartilhado.
