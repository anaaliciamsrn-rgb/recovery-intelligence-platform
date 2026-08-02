# 0014 — Evidence Model

## Status

Aceito e implementado

## Contexto

Toda consulta futura a uma fonte de dados (interna ou externa — PGFN, DataJud, Receita, Portal da Transparência, CENPROT, ver [ADR 0013](0013-identity-resolution-foundation.md) e [ADR 0015](0015-dossie-base.md)) precisa devolver não só um valor, mas também de onde veio, quando, com que confiança, e — criticamente — se a consulta de fato aconteceu e o que ela encontrou. Este ADR registra a estrutura genérica que representa isso.

## Decisão

### Shared kernel, não um módulo de negócio

`Evidence<T>` e `ConfidenceScore` vivem em `apps/api/src/domain/value-objects/` (shared kernel), não em `modules/identity-resolution` nem em nenhum outro módulo — são genéricos o suficiente para qualquer bounded context futuro reutilizar, exatamente o critério que o ADR 0010 usa para decidir o que fica no shared kernel.

### `ConfidenceScore` duplicado deliberadamente

Já existe um `ConfidenceScore` dentro de `modules/identity-resolution`. Uma segunda cópia foi criada aqui, no shared kernel, em vez de mover a existente. Motivo: mover exigiria alterar os imports de `modules/identity-resolution` (um refactor fora do escopo desta sprint), e o shared kernel não pode depender de um módulo de negócio específico. É o mesmo raciocínio que já levou `IIdGenerator`/`IClock` a serem duplicados por módulo nos ADRs 0010/0011 — cada camada com a cópia que precisa, sem acoplamento cruzado.

### Union discriminada, não uma classe com campos opcionais

`Evidence<T>` é modelado como `EvidenceEncontrada<T> | EvidenceNaoEncontrada | EvidenceNaoConsultada | EvidenceComErro`, discriminados pelo campo `status`. Esta foi a decisão central da sprint: o requisito era que os quatro estados (encontrado, não encontrado, não consultado, erro de consulta) "nunca podem ser confundidos". Uma classe com campos nullable (`valor?: T`, `motivoErro?: string`) permitiria justamente essa confusão em runtime — ex.: checar `if (evidence.valor)` e tratar um valor falsy encontrado como "não encontrado", ou esquecer de checar `status` antes de ler `motivoErro`. Com a union discriminada, o TypeScript não deixa ler `valor` fora do branch `ENCONTRADO`, nem `motivoErro` fora do branch `ERRO_CONSULTA` — a exclusividade dos estados é garantida em tempo de compilação, não por disciplina do desenvolvedor.

Campos por estado, deliberadamente diferentes (não um superset com nulls):

- `ENCONTRADO`: `valor`, `fonte`, `dataConsulta`, `confidenceScore`.
- `NAO_ENCONTRADO`: `fonte`, `dataConsulta`, `confidenceScore` (sem `valor`) — a consulta aconteceu e concluiu que não existe, com algum grau de confiança nessa conclusão.
- `NAO_CONSULTADO`: só `fonte` — representa uma fonte que ainda nem foi chamada, não uma chamada vazia. Não tem `dataConsulta` porque não houve consulta.
- `ERRO_CONSULTA`: `fonte`, `dataConsulta`, `motivoErro` (sem `valor` nem `confidenceScore`) — a consulta falhou; não sabemos se o dado existe ou não, então nenhuma confiança é atribuível.

### `fonte` é `string` livre, não um enum fechado

Diferente de `IdentitySourceType` (enum fechado dentro de `identity-resolution`), `Evidence.fonte` é uma string livre. Um enum fechado aqui exigiria o shared kernel conhecer todas as fontes de todos os módulos futuros — o oposto de ser genérico. Cada consumidor (Dossiê, Score) decide o vocabulário de fontes que faz sentido para ele.

## Consequências

- O Dossiê (Sprint 6) usa `Evidence<T>` como o tipo de cada campo vindo de uma fonte externa — nenhum novo conceito de "resultado de consulta" deveria ser inventado ali.
- `pnpm typecheck` não inclui `tests/` (gap já registrado no backlog técnico da fundação) — os testes deste modelo verificam a diferenciação dos quatro estados em runtime (via `status` e `"campo" in evidence`), não via `@ts-expect-error`, que não seria de fato checado neste projeto hoje.
