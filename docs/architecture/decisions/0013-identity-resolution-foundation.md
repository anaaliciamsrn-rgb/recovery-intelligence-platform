# 0013 — Identity Resolution Foundation

## Status

Aceito e implementado

## Contexto

Próximas features (Score, Dossiê) vão precisar comparar uma query (documento/nome vindo de uma consulta) contra candidatos de múltiplas fontes (cadastro interno hoje; Receita Federal, PGFN, DataJud, Portal da Transparência, CENPROT no futuro) para decidir se referem à mesma pessoa/empresa. Este ADR registra a fundação — contratos, modelos, confidence score — sem nenhum algoritmo sofisticado de resolução de identidade.

## Decisão

### Novo módulo `identity-resolution`, nome completo de propósito

Nome escolhido para não colidir com `modules/identity` (autenticação) — são conceitos completamente diferentes (resolução de identidade entre fontes de dados vs. quem está logado). `identity-resolution` depende de `modules/party` (upstream) para a única fonte real desta fase; `party` nunca sabe que `identity-resolution` existe.

### Sinais (`MatchSignal`) ≠ Evidence Model (Sprint 5)

`MatchSignal` é um conceito estreito, interno ao motor de resolução: uma observação ao comparar query e candidato (ex.: "documento idêntico", peso 1, favorável). Nunca é persistido, nunca é exposto fora do fluxo de `ResolveIdentityUseCase`. O Evidence Model genérico (usado por todas as consultas futuras — PGFN, Receita etc., com estados encontrado/não encontrado/não consultado/erro) é um conceito **diferente e mais amplo**, tratado no [ADR 0014](0014-evidence-model.md). Os dois não devem ser confundidos nem unificados prematuramente.

### `ConfidenceScore` normalizado, `IdentityMatchScorer` puro

Score sempre em `[0,1]`, nunca um número solto. A agregação de sinais em score+decisão (`IdentityMatchScorer`) é um domain service puro (sem I/O), mesmo padrão de `RolePermissionPolicy` em identity — média ponderada simples (soma dos pesos favoráveis / soma total dos pesos). Limiares (ALTA ≥ 0.8, MEDIA ≥ 0.5, BAIXA abaixo) decidem tanto a classificação de confiança quanto a `MatchDecision` (MATCH/POSSIBLE_MATCH/NO_MATCH) — um único lugar de verdade para os dois.

### Estrutura para múltiplas fontes, uma implementação real

`IIdentityResolutionSourceProvider` é o contrato; `ResolveIdentityUseCase` recebe uma lista deles, sem conhecer nenhum concretamente. `IdentitySourceType` já lista as fontes previstas para o Dossiê (Sprint 6): `INTERNAL`, `RECEITA_FEDERAL`, `PGFN`, `DATAJUD`, `PORTAL_TRANSPARENCIA`, `CENPROT` — só `INTERNAL` tem provider real (`PartyIdentitySourceProvider`, que consulta os cadastros de `Pessoa`/`Empresa` já existentes). As demais existem como tipo fechado, sem nenhuma integração.

### Estratégia deliberadamente trivial

`ExactDocumentMatchStrategy` produz um único sinal (documento normalizado idêntico ou não). Nenhuma similaridade de nome, fonética, ou peso composto — isso é "algoritmo sofisticado", explicitamente fora do escopo desta sprint. Trocar a estratégia no futuro não deve exigir mudar `ResolveIdentityUseCase` nem `IdentityMatchScorer`.

### Sem persistência

`ResolveIdentityUseCase` é stateless — não grava histórico de resoluções. `IdentityMatchResult` é um valor computado, sem identidade própria, que nasce e morre dentro da execução do use case. Persistir resultados de resolução fica para quando isso for de fato necessário (ex.: auditoria de matching), não implementado aqui.

## Consequências

- `POST /api/v1/identity-resolution/resolve` existe e está autenticado, mas é deliberadamente pouco útil sozinho hoje — o valor aparece quando o Dossiê (Sprint 6) começar a consumir isso com fontes externas reais.
- Adicionar uma fonte externa real no futuro é: implementar `IIdentityResolutionSourceProvider` para ela e registrá-la no array do container — nenhuma mudança em `ResolveIdentityUseCase`.
- Adicionar um algoritmo de matching mais sofisticado é: implementar `IIdentityResolutionStrategy` — nenhuma mudança no scorer nem no use case.
