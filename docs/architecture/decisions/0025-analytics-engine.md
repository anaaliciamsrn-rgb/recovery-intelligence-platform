# 0025 — Analytics Engine

## Status

Aceito e implementado

## Contexto

Sexta etapa do lote contínuo (5–15). KPIs agregados de toda a carteira: score médio, distribuição de risco, canais mais recomendados, confiança média, fatores mais frequentes, evolução temporal, métricas por fonte, estatísticas agregadas.

## Decisão

### `GET /api/v1/analytics/summary`, agregando dados já existentes — nunca reclassificando em massa

Recalcular classificação/recomendação para cada Dossiê da base seria caro e desnecessário: `dossier-versioning` (ADR 0022) já persiste, a cada mudança de evidência, o `riskScore`/`confidenceScore`/`classificacao`/`fatores`/`recomendacoes` daquele instante. Analytics lê a **versão mais recente de cada Dossiê** (`IVersionSnapshotRepository.findLatestPerDossie`, novo método) para os KPIs "atuais", e **todas as versões** (`findAll`, novo método) só para a evolução temporal, que precisa de histórico real, não só do presente.

### Extensões aditivas a repositórios existentes, não modificações

`IVersionSnapshotRepository` ganhou `findLatestPerDossie()`/`findAll()`; `IImportBatchRepository` ganhou `count()`. Mesma categoria de mudança já aceita nesta sessão para `IPessoaRepository`/`IEmpresaRepository.findAll()` (ADR 0019): métodos novos, comportamento existente intocado, nenhum use case ou teste anterior alterado — só os _fakes_ de teste precisaram declarar os métodos novos para continuar satisfazendo a interface (mudança mecânica, não comportamental).

### Dependência direta em `party`/`import`/`dossier-versioning` — mesma exceção do ADR 0024

Analytics não fabrica número nenhum: total de pessoas/empresas vem de `findAll().length` (mesma ressalva de escala já registrada), total de importações de `count()`, e todos os KPIs de risco/confiança/canal/fator vêm de dados reais já persistidos por `dossier-versioning`. Mesma exceção deliberada ao padrão de independência entre módulos-etapa já registrada no ADR 0024 — a alternativa (inventar números) seria pior.

### `fatoresMaisFrequentes`/`canaisMaisRecomendados` sobre a versão mais recente, não sobre todo o histórico

Contar sobre todas as versões inflaria artificialmente os números de Dossiês que foram atualizados muitas vezes — a pergunta de negócio é "quais fatores/canais são mais comuns _hoje_", não "quantas vezes cada um já apareceu historicamente". Só `evolucaoTemporal` usa o histórico completo, porque essa é literalmente a métrica que precisa dele.

## Consequências

- Sem migration — nenhuma tabela nova, só dois métodos de leitura adicionais em repositórios já existentes.
- Ainda sem isolamento por tenant (ver Etapa 9/ADR 0028) — o resumo é global, de toda a plataforma. Quando o multi-tenant existir de fato para os módulos mais antigos, este endpoint precisará de um filtro — registrado como backlog, não implementado agora.
- `scoreMedio`/`confiancaMedia` são médias simples (não ponderadas por volume de evidência) — suficiente para o KPI pedido, sem sofisticação estatística adicional.
