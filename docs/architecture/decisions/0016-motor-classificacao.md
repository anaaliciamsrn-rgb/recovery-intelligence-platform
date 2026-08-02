# 0016 — Motor de Classificação (Explainable Rule Engine)

## Status

Aceito e implementado

## Contexto

Segundo consumidor do Dossiê (Sprint 6): transforma as evidências acumuladas num veredito de risco explicável. O requisito explícito era um motor de regras, não Machine Learning — cada classificação precisa expor score, fatores, pesos, justificativa e confiança, não uma caixa-preta.

## Decisão

### `RiskScore` ≠ `ConfidenceScore` — duas dimensões independentes

`RiskScore` (novo, específico deste módulo) responde "o quão arriscado é este sujeito". `ConfidenceScore` (shared kernel, ADR 0014) responde "o quão seguros estamos dessa conclusão". As duas nunca são combinadas num único número — um dossiê vazio (nenhuma evidência respondida) produz `RiskScore = 0` (nada encontrado contra o sujeito) e `ConfidenceScore = 0` (não sabemos nada) simultaneamente, e essa combinação é o comportamento correto, não uma contradição.

### Regras produzem `Fator | null`, nunca um fator neutro

Cada `IClassificationRule.avaliar()` devolve `null` quando não tem evidência suficiente para se pronunciar (ex.: fonte ainda `NAO_CONSULTADO`, ou `valor` num formato inesperado) — nunca um `Fator` com peso zero ou direção arbitrária. Isso é o que torna a classificação honesta: um dossiê sem nenhuma evidência respondida produz uma lista de fatores vazia, refletida tanto no score (0, neutro) quanto na confiança (0, "não sabemos").

### Regras deliberadamente triviais, sem ML

`PendenciaFiscalPgfnRule`, `ProcessoJudicialDataJudRule`, `SituacaoCadastralReceitaRule` são comparações estruturais simples (`valor.temPendencia === true`, `valor.situacaoCadastral !== "ATIVA"`) sobre o `valor: unknown` de cada evidência, com type guards defensivos — se o formato não bate com o esperado, a regra devolve `null` em vez de lançar erro. Nenhuma delas tem acesso a nenhuma outra além da sua própria fonte; regras não se combinam nem se sobrepõem.

### Confiança = fração de evidências respondidas

`CalculadoraConfianca` não olha para o conteúdo das evidências, só para `status`: `ENCONTRADO`/`NAO_ENCONTRADO` contam como "respondida", `NAO_CONSULTADO`/`ERRO_CONSULTA` não. Confiança = respondidas / total (5 fontes). É uma métrica de completude de dados, não de qualidade do resultado — deliberadamente simples, coerente com "sem ML" desta sprint.

### Domínio de `classification` desacoplado do domínio de `dossie`

`CalculadoraConfianca`/`ClassificacaoRiscoScorer`/`Fator`/`RiskScore` não importam nada de `modules/dossie` — recebem `Evidence<unknown>[]`/`ClassificationRuleInput` (tipos deste módulo). Só a application layer (`ClassificarDossieUseCase`) conhece `IDossieRepository` de `dossie`, igual ao padrão já usado por `identity-resolution` e `dossie` em relação a `party`.

### Stateless, sem persistência

Mesma decisão do `ResolveIdentityUseCase` (ADR 0013): `ClassificacaoResultado` é computado a cada chamada, nunca guardado. Se o produto precisar de histórico de classificações, é uma decisão futura separada.

## Consequências

- O Recommendation Engine (Sprint 8) consome `ClassificacaoResultado` (`classe`, `score`, `confianca`) como entrada — nenhuma nova forma de "risco" deveria ser inventada ali.
- Adicionar uma regra nova é implementar `IClassificationRule` e registrá-la no array do container (`modules/classification/container.ts`) — nenhuma mudança no use case nem nos scorers.
- Os pesos das três regras atuais (0.4, 0.35, 0.25) foram escolhidos arbitrariamente para somar 1.0 quando todas as três se aplicam — não vêm de nenhuma calibração real. Ajustá-los é mudança de configuração, não de arquitetura.
