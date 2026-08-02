# 0020 — Explainability Engine

## Status

Aceito e implementado

## Contexto

Primeira etapa de uma evolução enterprise da plataforma. A classificação (ADR 0016) já expõe score, fatores e justificativa, mas cada fator é uma string solta (`nome`/`peso`/`direcao`/`justificativa`) sem apontar para a evidência de onde veio — insuficiente para auditoria: um auditor precisa poder rastrear "por que este fator existe" até um registro concreto (fonte + data + valor), não só até uma frase. O requisito explícito era um endpoint de explicação pronto para auditoria mais uma timeline da cadeia de decisão (consulta → fontes → dossiê → classificação → recomendação → prompt), sem inferir nada que não tenha evidência real por trás.

Restrição dura desta e de todas as etapas seguintes: nenhuma funcionalidade existente pode ser alterada, nenhum ADR anterior pode ser reescrito, nenhum teste pode quebrar. Este módulo é 100% aditivo.

## Decisão

### Novo módulo `modules/explainability`, mesma Clean Architecture

`domain/application/infrastructure/presentation/container.ts`, seguindo o mesmo padrão de duplicação deliberada já estabelecido (ADRs 0010/0011/0013/0016/0017/0018/0019): o container reconstrói suas próprias instâncias de `ClassificarDossieUseCase`, `GerarRecomendacoesUseCase` e `BuildPromptUseCase` (mesmas regras, replicadas) em vez de receber instâncias de outros módulos. Nenhum arquivo de `classification`, `recommendation`, `prompt-builder` ou `dossie` foi modificado.

### `FatorSourceMapper`: liga cada `Fator` à sua evidência real, ou falha — nunca infere

`IClassificationRule` (ADR 0016) não expõe qual fonte de evidência originou um `Fator` — só `nome`/`avaliar()`. Como esse contrato não pode ser alterado (módulo aprovado), a ligação fator→fonte é feita por uma tabela explícita (`FATOR_NOME_PARA_FONTE`) dentro deste módulo, mapeando o `nome` literal de cada uma das três regras hoje registradas (`PendenciaFiscalPgfnRule`, `ProcessoJudicialDataJudRule`, `SituacaoCadastralReceitaRule`) à fonte/campo de evidência correspondente no Dossiê. Se um fator vier com um nome fora dessa tabela, `FatorSourceMapper.map` lança `FatorSemFonteMapeadaError` em vez de adivinhar — cumprindo literalmente "nenhuma informação pode ser inferida". **Consequência prática**: adicionar uma regra nova ao motor de classificação (`classification/container.ts`) exige adicionar a entrada correspondente aqui também — é a única sincronização manual entre os dois módulos, documentada e coberta por teste.

### `FatorExplicado.impacto`: transformação determinística, não um número novo

`impacto = peso` com o sinal da `direcao` (`+peso` se `AUMENTA_RISCO`, `-peso` se `REDUZ_RISCO`). É uma função pura dos dois campos que o `Fator` original já carrega — não é um dado novo nem uma estimativa, é a mesma informação reapresentada de forma que dá para somar/ordenar fatores por impacto real no score.

### Timeline construída só a partir de timestamps que existem de fato

- `CONSULTA_INICIADA` ← `Dossie.createdAt` (o Dossiê é, por definição, o início da investigação sobre o sujeito).
- `FONTES_CONSULTADAS` ← a maior `dataConsulta` entre as evidências do Dossiê que já foram respondidas; `timestamp: null` (nunca uma data inventada) quando nenhuma fonte foi consultada ainda.
- `DOSSIE_ATUALIZADO` ← `Dossie.updatedAt`.
- `CLASSIFICACAO_EXECUTADA` / `RECOMENDACAO_GERADA` / `PROMPT_CRIADO` ← o instante real em que `GetClassificationExplanationUseCase` executou, nesta mesma chamada, `ClassificarDossieUseCase` → `GerarRecomendacoesUseCase` → `BuildPromptUseCase`. Isso não é inferência: esses três motores são _stateless e recalculados a cada chamada_ (decisão já registrada nos ADRs 0016/0017/0018), então "agora" é literalmente quando essas etapas aconteceram nesta explicação — não uma aproximação.

### `GET /api/v1/classification/:id/explanation` — `:id` é o `dossieId`

Mesma decisão de `GET /api/v1/classificacoes/:dossieId` e `GET /api/v1/prompts/:dossieId`: como classificação/recomendação/prompt nunca são persistidos com identidade própria (ADRs 0016/0017/0018), o Dossiê é o único identificador estável de "a explicação de quem".

### Composição, não duplicação de lógica de negócio

`GetClassificationExplanationUseCase` não reimplementa nenhuma regra de classificação, recomendação ou montagem de prompt — só orquestra os três use cases existentes e enriquece o resultado com `FatorSourceMapper`/`DecisionTimelineBuilder` (dois domain services novos, puros, sem I/O). Mesmo padrão de composição de `BuildPromptUseCase` sobre `ClassificarDossieUseCase`/`GerarRecomendacoesUseCase` (ADR 0018).

### Sem persistência

`ClassificationExplanation` é computado a cada chamada, nunca guardado — mesma decisão stateless de `ClassificacaoResultado`/`PromptContext`/`IdentityMatchResult`. Se o produto precisar de histórico de explicações auditadas, é decisão futura separada (ver Etapa 2 — Audit Trail, próxima desta mesma evolução).

## Consequências

- Toda classificação hoje só pode ser explicada com evidência real de uma das três regras registradas em `classification`. Uma regra nova nesse módulo que não ganhe entrada correspondente em `FATOR_NOME_PARA_FONTE` (`FatorSourceMapper.ts`) faz este endpoint falhar com `FatorSemFonteMapeadaError` em vez de mostrar um fator sem fonte — comportamento intencional, não um bug a esconder.
- `GET /:id/explanation` executa a cadeia completa (classificação + recomendação + prompt) a cada chamada — mesmo custo de chamar os três endpoints separados hoje. Se isso se tornar um problema de performance com volume real, cache é uma decisão futura separada, não implementada aqui.
- Item de backlog explícito: quando a Etapa 2 (Audit Trail) existir, este é o primeiro módulo que deveria passar a registrar um evento por explicação consultada — mas isso não foi implementado nesta etapa.
