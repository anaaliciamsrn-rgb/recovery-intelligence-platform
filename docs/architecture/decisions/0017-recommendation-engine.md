# 0017 — Recommendation Engine

## Status

Aceito e implementado

## Contexto

Terceiro consumidor da cadeia Dossiê → Classificação → Recomendação. Transforma o veredito de risco (Sprint 7) numa lista de canais de cobrança recomendados (WhatsApp, ligação, cobrança amigável, parcelamento, cobrança jurídica), cada um explicável.

## Decisão

### Mesma filosofia de motor de regras da Sprint 7

`IRecommendationRule.avaliar()` devolve `RecomendacaoCobranca | null`, nunca uma recomendação vazia — mesmo padrão de `IClassificationRule`. Cinco regras, uma por canal, cada uma com sua própria condição sobre `{classe, score, confianca, nivelConfianca}`.

### Ação drástica exige confiança suficiente, não só risco alto

`RecomendarCobrancaJuridicaRule` e a parte de `RecomendarParcelamentoRule` aplicável a `ALTO_RISCO` exigem `nivelConfianca !== "BAIXA"`, mesmo com `classe === "ALTO_RISCO"`. Isso foi descoberto na prática durante os testes desta sprint: um dossiê com uma única evidência de PGFN (`temPendencia: true`, com `confidenceScore` alto) classifica corretamente como `ALTO_RISCO`, mas a **confiança geral** da classificação (`CalculadoraConfianca`, Sprint 7) é baixa, porque só 1 das 5 fontes foi de fato consultada — as outras 4 permanecem `NAO_CONSULTADO`. Recomendar escalonamento jurídico nesse cenário seria agir de forma desproporcional sobre dados incompletos. O primeiro teste desta sprint esperava `COBRANCA_JURIDICA` nesse cenário exato e falhou — não por bug no motor, mas porque o teste não tinha entendido essa própria regra que o motor foi desenhado para impor. Corrigido ajustando os testes (registrar evidências suficientes para tirar a confiança da faixa `BAIXA`), não o comportamento.

### Fallback explícito, nunca lista vazia sem explicação

Se nenhuma regra se aplica (ex.: `ALTO_RISCO` com confiança baixa, e nenhuma outra regra dispara), `GerarRecomendacoesUseCase` devolve uma recomendação de `COBRANCA_AMIGAVEL` com justificativa explícita do porquê — nunca uma lista vazia sem explicação, o que violaria "toda recomendação deve ser explicável" mesmo no caso degenerado.

### Duplicação deliberada de `ClassificarDossieUseCase`

O container deste módulo constrói sua própria instância de `ClassificarDossieUseCase` (mesmas regras de `classification`, replicadas) em vez de receber a instância de outro módulo — mesmo padrão já estabelecido em toda a plataforma (ADRs 0010/0011/0013/0016).

## Consequências

- O Prompt Builder (Sprint 9) consome tanto `ClassificacaoResultado` quanto as `RecomendacaoCobranca[]` — a estrutura de saída de `GerarRecomendacoesUseCase` (`{ dossieId, classificacao, recomendacoes }`) é o formato mais próximo de "pronto para virar contexto de LLM" que este projeto já produziu.
- Adicionar um canal novo é implementar `IRecommendationRule` e registrá-lo no container — nenhuma mudança no use case.
- Recomendações continuam não persistidas (mesma decisão stateless das Sprints 4 e 7).
