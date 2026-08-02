# 0027 — Workflow Engine

## Status

Aceito e implementado

## Contexto

Oitava etapa do lote contínuo (5–15). Motor configurável: estados, transições, regras (condições), gatilhos e ações — novos fluxos criados via dados, nunca via código novo.

## Decisão

### `WorkflowDefinition` + `WorkflowTransitionRecord`: um agregado carregado por completo

Diferente de `Case`/`CaseNote`/`CaseHistoryEntry` (ADR 0026), as transições de uma definição são carregadas **junto** com ela (`include: { transicoes: true }`) — não são um log que cresce sem limite, são o próprio conteúdo do fluxo. `save()` substitui inteiramente as transições a cada chamada (delete-all-and-recreate dentro de uma transação Prisma), suficiente porque hoje só a criação chama `save()` — nenhum use case edita transições de uma definição já criada.

### `WorkflowEngine`: serviço de domínio puro, sem I/O

`encontrarTransicao(definicao, estadoAtual, gatilho, contexto)` filtra as transições que casam estado+gatilho e devolve a primeira cuja condição seja satisfeita (ou sem condição) — a ordem de definição das transições funciona como prioridade implícita. Condição é uma estrutura fechada e serializável (`{campo, operador, valor}`, quatro operadores) — o suficiente para os cenários pedidos, sem motor de expressões genérico.

### `WorkflowInstance` referencia qualquer entidade por `referenciaId` solto

Sem `@relation` no Prisma — pode apontar para um `Case.id` (module case-management), ou para qualquer outra entidade futura, sem `workflow` precisar conhecer o tipo do lado de lá. Mesmo padrão de referências soltas já usado em toda a plataforma.

### `acao` é um rótulo, não uma integração real — limitação de escopo deliberada

Uma transição pode carregar um `acao: string | null` (ex.: `"NOTIFICAR"`, `"ENCERRAR_CASE"`), devolvido no resultado de `TriggerWorkflowTransitionUseCase` — mas **nenhum efeito colateral real é disparado** nesta etapa (nenhuma chamada a `case-management` ou qualquer outro módulo). Executar a ação de fato ficaria acoplado a decidir qual módulo cada rótulo aciona — decisão de produto fora do escopo desta etapa, registrada como backlog explícito, não escondida atrás de um "TODO" morto.

### Relação com `Case.TRANSICOES_VALIDAS` (ADR 0026): alternativa, não substituição

O ciclo de vida padrão do `Case` continua validado pela tabela fixa em `case-management` — este motor genérico é uma capacidade nova, paralela, para fluxos que precisem de configuração sem deploy. Nenhuma linha de `case-management` foi alterada.

## Consequências

- Migration `add_workflow_module`: models `WorkflowDefinition`, `WorkflowTransitionRecord`, `WorkflowInstance`, `WorkflowInstanceHistoryEntry`.
- Endpoints novos: `POST /workflows`, `GET /workflows`, `GET /workflows/:id`, `POST /workflows/:id/instances`, `GET /workflow-instances/:id`, `POST /workflow-instances/:id/trigger` — todos autenticados.
- Backlog: conectar `acao` a um efeito real (ex.: mudar o status de um `Case` automaticamente) exige uma decisão explícita de acoplamento entre módulos, não implementada aqui.
- Sem isolamento por tenant ainda (ver Etapa 9/ADR 0028).
