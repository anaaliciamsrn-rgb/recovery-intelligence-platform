# 0018 — Prompt Builder

## Status

Aceito e implementado

## Contexto

Última peça da cadeia desta sessão: Pessoa/Empresa → Participação Societária → Dossiê → Classificação → Recomendação → **Prompt Builder**. Prepara a camada de saída destinada a um futuro Agente de IA — sem integrar nenhuma API de LLM de fato.

## Decisão

### Uma fonte de verdade, duas representações

`PromptContext` é montado uma vez por `BuildPromptUseCase`; `PromptBuilder.toStructuredJson()` e `PromptBuilder.toTextPrompt()` são duas funções puras que leem o MESMO objeto. Isso garante que as duas representações nunca divergem entre si — não existe caminho de código em que o JSON diga uma coisa e o texto diga outra, porque ambos derivam exatamente da mesma estrutura, sem estado próprio.

### `PromptContext` é plano e já serializado, não um agregado de domínio

Datas como string ISO, enums como `string` solto (não os tipos fechados de `classification`/`recommendation`) — de propósito. `PromptContext` é a fronteira de saída da plataforma: depois dele, só existe apresentação (JSON/texto), nunca mais lógica de negócio. Deixar os tipos soltos aqui evita que este módulo, que é o mais "de borda" de todos, precise importar os enums internos de três módulos diferentes.

### Reaproveita os use cases existentes por composição, não por herança nem duplicação de lógica

`BuildPromptUseCase` chama `ClassificarDossieUseCase.execute()` e `GerarRecomendacoesUseCase.execute()` diretamente — nenhuma regra de classificação ou recomendação é reimplementada aqui. O único código genuinamente novo deste módulo é a busca do sujeito (Pessoa/Empresa) e a montagem/formatação do contexto. Mesmo padrão de duplicação de **construção** (não de lógica) já usado em toda a plataforma: o container deste módulo recria suas próprias instâncias das regras de classificação/recomendação, mas a lógica em si (as classes de regra) é a mesma código, só instanciada de novo.

### Sem chamada a nenhum provedor de LLM

Este ADR e este módulo entregam exatamente o que a Sprint 9 pediu: a camada que produz o que um agente de IA vai consumir. Nenhuma chamada de rede a OpenAI/Anthropic/etc. foi feita ou é necessária — isso é, deliberadamente, a próxima decisão arquitetural quando essa integração existir de fato (provavelmente um novo port `ILlmProvider` recebendo o `text` deste módulo).

## Consequências

- Esta é a última peça do plano de 9 sprints desta sessão. A plataforma agora tem uma cadeia ponta-a-ponta: cadastro → vínculo societário → evidências → classificação explicável → recomendação explicável → contexto pronto para IA — tudo sobre dados reais (Postgres), validado por 231 testes automatizados.
- Quando um Agente de IA real existir, ele consome `GET /api/v1/prompts/:dossieId` e decide o que fazer com `text` (ou `structured`) — nenhuma mudança nos módulos anteriores é esperada só por isso.
- `PromptContext` não é persistido — cada chamada reconstrói tudo do zero a partir do estado atual do Dossiê. Se o produto precisar de histórico de prompts gerados, é decisão futura separada.
