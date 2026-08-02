# 0024 — Heatmap de Confiança

## Status

Aceito e implementado

## Contexto

Quinta etapa da evolução enterprise (lote contínuo, etapas 5–15). O pedido: explicar visualmente quais fontes contribuem para a confiança de um Dossiê — confiança por fonte, contribuição percentual, fontes ausentes, fontes conflitantes, confiança histórica e agregada.

## Decisão

### Novo módulo `modules/confidence-heatmap`, mesma Clean Architecture

Endpoint único `GET /api/v1/confidence-heatmap/:dossieId`, autenticado. Composição sobre `ClassificarDossieUseCase` (classification, reaproveitado sem modificação) para obter fatores/score/confiança agregada atuais.

### Métrica de contribuição percentual própria deste módulo, distinta da confiança agregada

`CalculadoraConfianca` (classification, ADR 0016) mede confiança agregada como fração de fontes respondidas — não pondera pelo valor de cada `confidenceScore` individual. Este módulo calcula, para cada fonte respondida, sua participação percentual na soma das `confidenceScore` de todas as fontes respondidas — uma métrica complementar, não uma substituta, deliberadamente diferente e explicitamente documentada como tal para não ser confundida com a agregada.

### "Fontes conflitantes": definição determinística explícita

Definidas como as fontes cujo fator de classificação participa de uma divergência de direção — isto é, quando existem simultaneamente fatores `AUMENTA_RISCO` e `REDUZ_RISCO` entre os fatores computados, todas as fontes envolvidas nessa combinação são marcadas como conflitantes. Sem essa condição (todos os fatores concordam, ou não há fatores), a lista vem vazia. Não há inferência probabilística — é uma regra fixa e auditável.

### Exceção deliberada: depende de `dossier-versioning` para confiança histórica

Todos os módulos-etapa anteriores (explainability, audit-trail, dossier-versioning, simulation) evitaram depender uns dos outros, preferindo duplicar pequenas tabelas/lógicas. Aqui a exceção é justificada: "confiança histórica" exige dados reais de histórico, e a única fonte de verdade da plataforma para isso é `VersionSnapshot` (ADR 0022). Fabricar histórico para manter a independência entre módulos seria pior — inventaria dados. `GetConfidenceHeatmapUseCase` depende de `IVersionSnapshotRepository` (porta já pública de `dossier-versioning`) só para leitura.

### Sem persistência, sem migration

Todo o cálculo é derivado do estado atual do Dossiê + histórico já existente — nenhuma tabela nova.

## Consequências

- Se `dossier-versioning` nunca criou nenhum snapshot para um Dossiê (ex.: criado antes daquele módulo existir), `confiancaHistorica` vem vazia — resultado honesto, não um erro.
- A tabela fonte→regra usada para detectar conflito duplica, de propósito, a mesma tabela de 3 linhas já vista em `FatorSourceMapper` (ADR 0020) e `SimulationImpactAnalyzer` (ADR 0023) — mesma decisão de manter módulos-etapa independentes por padrão.
