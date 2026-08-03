# 0038 — Riqueza da demonstração, explicabilidade sem gambiarra e primeira integração externa real

## Status

Aceito e implementado

## Contexto

Com a ADR 0037 em produção (multi-tenant real + importação de carteira), o pedido desta fase teve três eixos: (1) tornar a demonstração rica o suficiente para uma apresentação comercial (sócios, casos, alertas, "análise da IA" visível), (2) fechar uma lacuna real de arquitetura no motor de classificação explicável, e (3) responder a uma pergunta direta do usuário — "o sistema busca dados na internet de verdade?" — com honestidade, e então implementar a única parte disso que é legal e tecnicamente viável.

## Decisão 1 — `Fator.fonte`: elimina três tabelas duplicadas que ficavam obsoletas em silêncio

Antes desta fase, `Fator` (classification, ADR 0016) não sabia de qual fonte de evidência ele vinha — só carregava `nome`/`peso`/`direcao`/`justificativa`. Três módulos diferentes precisavam dessa ligação e cada um mantinha sua própria tabela `nome do fator → fonte`:

- `FatorSourceMapper` (explainability, ADR 0020) — lançava `FatorSemFonteMapeadaError` em runtime se a tabela não tivesse entrada para um fator novo.
- `ConfidenceHeatmapBuilder` (confidence-heatmap, ADR 0024) — usava a tabela pra detectar conflitos entre fontes.
- `SimulationImpactAnalyzer` (simulation, ADR 0023) — usava a direção inversa (fonte → nome do fator) pra explicar impacto de uma mudança hipotética.

Nenhuma das três tabelas era atualizada automaticamente ao registrar uma regra nova — ficavam obsoletas em silêncio até alguém tropeçar no erro em runtime. `Fator` ganhou um campo `fonte: DossieFonte`, preenchido pela própria regra que o produziu (`PendenciaFiscalPgfnRule`/`ProcessoJudicialDataJudRule`/`SituacaoCadastralReceitaRule`). As três tabelas foram removidas:

- `FatorSourceMapper` agora só precisa de uma tabela estrutural `fonte → campo de `DossieEvidencias`` (5 entradas, exaustiva sobre um enum fechado — não pode ficar obsoleta ao adicionar uma regra, só ao adicionar uma fonte nova, o que já exige tocar `Dossie.ts` de qualquer forma).
- `ConfidenceHeatmapBuilder.detectarConflitos` usa `fator.fonte` direto.
- `SimulationImpactAnalyzer` busca o fator por `fonte` em vez de por nome — `FatorSnapshot` (tanto em `dossier-versioning` quanto na cópia duplicada de `simulation`, mesmo padrão de duplicação-sobre-acoplamento das duas) ganhou o mesmo campo.

Efeito colateral positivo: `FatorSemFonteMapeadaError` deixou de existir — a classe inteira de erro "esqueci de atualizar uma tabela" ficou impossível por construção.

## Decisão 2 — Casos tenant-scoped sem `TenantResourceOwnership` própria para `Case`

A ADR 0037 deixou registrado como limitação conhecida. A correção não precisou de nenhuma tabela nova: um `Case` pertence ao tenant do seu `Dossie` transitivamente. `ICaseRepository` ganhou `findManyByDossieIds(dossieIds, filter, pagination)`; `ListCasesUseCase` resolve `dossieIds = listResourceIds(tenantId, "Dossie")` (mesma chamada já usada em `analytics`) e filtra por esse conjunto. Zero coluna nova, zero migração.

## Decisão 3 — Pipeline de importação de empresas fica investigativo de verdade

Três adições aditivas ao `ImportEmpresasSpreadsheetUseCase` (ADR 0037), sem alterar o pipeline existente:

**Sócios/administradores fictícios reais no banco** (`IEmpresaOwnershipSimulator`/`SimulatedEmpresaOwnershipProvider`, mesmo PRNG semeado por CNPJ do simulador de evidências): cada Empresa importada ganha de 1 a 3 vínculos societários reais em `ParticipacaoSocietaria` (`party`, ADR 0012) — a coluna "Responsável" da planilha se torna o sócio-administrador principal quando presente; os demais são gerados. Isso é o que faz o Grafo de Relacionamento (`RelationshipGraphPage`) parar de mostrar "nenhum vínculo encontrado" para toda empresa importada.

**Triagem automática de casos**: toda Empresa que sai da importação como `MEDIO_RISCO`/`ALTO_RISCO` (nunca `BAIXO_RISCO`) já nasce com um `Case` aberto (`CreateCaseUseCase`/`UpdateCaseDetailsUseCase`/`CaseNote`, todos de `case-management`, duplicados aqui no mesmo padrão do resto do projeto), com prioridade derivada da classificação real, tags (`triagem-automatica-ia`, `<classe>`), e uma nota explícita marcando que foi o sistema, não uma pessoa (`autorId: null`), que abriu o caso.

**Planilha demo expandida para 50 empresas** (30 → 50), incluindo arquétipos deliberadamente super-representados (holdings, fomento mercantil) — o tipo de empresa mais comum numa carteira real de recuperação de crédito. Continuam inteiramente originais e fictícias, só inspiradas na estrutura.

## Decisão 4 — `AnalyticsSummary` ganha "empresas em maior risco" e "alertas", ambos derivados

`AnalyticsSummaryBuilder.build` recebe agora um `nomePorDossieId: Map<string,string>` (resolvido em `GetAnalyticsSummaryUseCase` via `IEmpresaRepository`, só para Dossiês tipo `EMPRESA` do tenant) e calcula:

- `empresasEmMaiorRisco`: top 5 por `riskScore` desc, entre os Dossiês cujo nome foi resolvido.
- `alertas`: strings geradas a partir de contagens reais sobre os snapshots do tenant (quantas empresas `ALTO_RISCO`, quantas com sanção `ENCONTRADO` no Portal da Transparência, quantas com protesto `ENCONTRADO` no CENPROT) — nunca texto fixo, um tenant sem nenhuma ocorrência real de um alerta simplesmente não o recebe.

## Decisão 5 — "Análise da IA" no Dossiê: dado que já existia, nunca exposto

`VersionSnapshot` já carregava `justificativaGeral`/`fatores`/`recomendacoes`/`confidenceScore` desde a ADR 0022 — só não havia nenhuma tela mostrando isso junto. `DossiePage` ganhou uma seção nova que busca a versão mais recente (`GET /dossiers/:id/history/:versao`, endpoint já existente) e apresenta: resumo executivo, pontos positivos/de atenção (fatores agrupados por direção), dimensões de risco avaliadas (fatores com sua fonte, mapeados a um rótulo de leitura), recomendação e nível de confiança. Nenhum dado novo — só a primeira apresentação coerente do que a Etapa 3 já computava.

## Decisão 6 — Busca de identidade pública: motor real, não uma simulação nova

`identity-resolution` (ADR 0013) já tinha um motor de scoring ponderado real (`IdentityMatchScorer`, `MatchDecision` MATCH/POSSIBLE_MATCH/NO_MATCH) — só nunca exposto numa tela, e o container público (`POST /identity-resolution/resolve`) usava `ExactDocumentMatchStrategy` (documento idêntico ou nada), incapaz de produzir uma "possível correspondência" de verdade.

- `FuzzyDocumentAndNameMatchStrategy` (novo) substitui `ExactDocumentMatchStrategy` nesse container: mede similaridade de documento por coincidência posicional de dígitos (não distância de edição — mesma disciplina "deliberadamente não sofisticado" de `PartialDocumentMatchStrategy`, ADR 0019) combinada com similaridade de nome, produzindo confiança intermediária real para documento com erro de digitação ou nome parecido.
- O container passou a registrar **duas** fontes (`PartyIdentitySourceProvider` + `PartyByNameIdentitySourceProvider`), então uma busca só por nome (documento incompleto) também funciona. `ResolveIdentityUseCase` ganhou deduplicação por `candidateId` — necessário agora que duas fontes podem sugerir o mesmo registro.
- `IdentityMatchResult` ganhou `candidateNome`/`candidateDocumento` (faltavam — o endpoint devolvia só um id opaco).
- `FindDossieForCandidateUseCase` (novo) liga um candidato a um Dossiê existente, **mas só se ele pertencer ao tenant do chamador** — mesma disciplina fail-closed de `TenantPolicy`: um Dossiê de outro tenant para o mesmo CNPJ (`Pessoa`/`Empresa` são cadastro global, ADR 0011) nunca é revelado, tratado como se não existisse.
- Nova página `ConsultaPage` (frontend) — a primeira UI para esse motor: busca por documento e/ou nome, mostra a decisão, a confiança, a tabela de sinais avaliados (sinal/peso/situação, inspirado na tabela "sinais" mostrada pelo usuário como referência de UX — nunca no código de terceiros), e um link pro Dossiê quando existe.

## Decisão 7 — Única integração externa real: Receita Federal via BrasilAPI, só para CNPJ

Pergunta direta do usuário: "o sistema busca dados na internet de verdade?" Resposta honesta dada antes de qualquer código: não, e não pode buscar dívida de CPF na internet de nenhuma forma legal e gratuita — birôs de crédito (Serasa/Boa Vista/Quod) são serviços pagos, e "buscar na net" o histórico financeiro de uma pessoa física por nome seria, na prática, depender de bases vazadas — ilegal, e por isso fora de questão.

O que existe de real, público e gratuito é a Receita Federal (via `BrasilAPI`, proxy público de código aberto — não é o código do concorrente mencionado pelo usuário, que foi explicitamente descartado como referência por risco de propriedade intelectual). Isso é **CNPJ apenas** — não existe fonte pública equivalente para CPF.

- `IReceitaFederalProvider`/`BrasilApiReceitaFederalProvider` (novo, módulo `import`): chama `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` com timeout de 8s. `404` → `NAO_ENCONTRADO` (resultado correto e esperado para os CNPJs fictícios da planilha demo — não é bug, é honestidade: dado fictício não pode aparecer como encontrado numa fonte real). Qualquer outra falha (rede, timeout, `429`, `5xx`) → `ERRO_CONSULTA`, nunca um `NAO_ENCONTRADO` disfarçado — usa exatamente a semântica de quatro estados que já existia (`Evidence`, ADR 0014).
- `ImportEmpresasSpreadsheetUseCase` chama esse provider só para a fonte Receita Federal; as outras quatro (PGFN/DataJud/Portal da Transparência/CENPROT) continuam simuladas — não existe API pública gratuita equivalente para elas.
- **Comportamento real observado em teste**: BrasilAPI é um serviço comunitário gratuito com limite de requisições por IP — sob teste intenso (múltiplas importações em sequência), a API respondeu `403`/`429`, e o sistema registrou `ERRO_CONSULTA` corretamente em vez de mascarar a falha. Sob uso normal e espaçado (um usuário real importando ocasionalmente), a consulta funciona — confirmado com uma empresa real (CNPJ `19.131.243/0001-97`, dado público) devolvendo situação cadastral, natureza jurídica, capital social e demais campos reais.

## Consequências

- 571 → 584 testes unitários (13 novos: `FuzzyDocumentAndNameMatchStrategy`, `FindDossieForCandidateUseCase`, `BrasilApiReceitaFederalProvider`, dedup em `ResolveIdentityUseCase`, sócios/casos em `ImportEmpresasSpreadsheetUseCase`, tenant-scoping em `ListCasesUseCase`).
- Nenhuma migração de schema nesta fase (Decisão 2 e 6 reaproveitam mecanismos já existentes).
- **Fora de escopo, explicitamente deferido**: QSA e Diário Oficial como 6ª/7ª fonte simulada (exigiria migração no `Dossie`, avaliado e adiado por risco/tempo, não esquecido); `Evidence.urlOrigem`; sinais de Identity Resolution além de documento+nome (cidade/estado/empresa/CNPJ relacionado/idade/profissão — os dois últimos exigem campos novos em `Pessoa`, que hoje só tem CPF+nome).
