# 0019 — Módulo de Importação (PGFN, CPF Mascarado)

## Status

Aceito e implementado

## Contexto

O cliente forneceu um único arquivo real (`Lista de Devedores` da PGFN) para transformar em carteira de cobrança dentro da plataforma. O arquivo segue o padrão oficial de transparência da PGFN: CPF sempre mascarado (`***.NNN.NNN-**`, só os 6 dígitos centrais visíveis), nunca o documento completo. Isso colide diretamente com a premissa original do pedido — "cada cliente importado deve automaticamente criar `Pessoa`" — porque o Value Object `CPF` (módulo `party`) exige um documento completo, com dígitos verificadores válidos, e não deve ser flexibilizado só para aceitar um formato que estruturalmente nunca traz esses dígitos. Fabricar dígitos ausentes para "completar" um CPF seria inventar identidade sobre dado real de terceiro — inaceitável tanto do ponto de vista de domínio (o VO existe para garantir que só documentos verificáveis entram no sistema) quanto de LGPD.

Confirmado explicitamente pelo cliente que esta é a única fonte disponível (não haverá uma segunda fonte com CPF completo), a decisão foi: importar toda linha válida como um registro rastreável, **sem** criar `Pessoa` automaticamente; resolver identidade contra o cadastro interno já existente **quando possível** (por sobreposição de nome + dígitos parciais); linhas sem correspondência ficam explicitamente marcadas como tal, nunca silenciosamente descartadas.

## Decisão

### Novo módulo `modules/import`, mesma Clean Architecture dos demais

`domain/application/infrastructure/presentation/container.ts`, seguindo o padrão de duplicação deliberada já estabelecido (ADRs 0010/0011/0013/0016/0017/0018): o `container.ts` deste módulo reconstrói suas próprias instâncias de `ClassificarDossieUseCase`, `GerarRecomendacoesUseCase`, `CreateDossieUseCase`, `RegistrarEvidenciaUseCase` e `ResolveIdentityUseCase` em vez de receber instâncias de outros módulos.

### `DocumentoMascarado`, um Value Object novo — não uma flexibilização do `CPF`

Valida apenas o _formato_ do mascaramento PGFN (`***.NNN.NNN-**`), nunca um checksum — porque não há dígitos suficientes para calcular um. É deliberadamente um VO diferente do `CPF`/`CNPJ` de `party`, não uma variante deles: representa um conceito diferente ("um documento que sabemos estar mascarado desta forma específica"), não "um CPF que ainda não foi validado".

### `ImportRowStatus` × `ImportResolutionStatus` — dois enums, nunca conflados

`ImportRowStatus` (`IMPORTADA`/`IGNORADA`/`INVALIDA`/`DUPLICADA`/`ERRO`) responde "a linha foi processada corretamente?". `ImportResolutionStatus` (`PENDENTE`/`RESOLVIDA`/`SEM_CORRESPONDENCIA`) responde, separadamente, "sabemos a quem ela pertence?". Só linhas `IMPORTADA` chegam a ter uma tentativa de resolução — as demais nunca avançam para lá. Misturar os dois num único enum esconderia a diferença entre "a linha é lixo" e "a linha é válida, mas não sabemos identificar o titular", que são situações operacionalmente muito diferentes (a segunda é candidata a intervenção manual; a primeira não).

### Resolução de identidade: extensão puramente aditiva de `identity-resolution` (ADR 0013)

O provider e a estratégia existentes (`PartyIdentitySourceProvider`, `ExactDocumentMatchStrategy`) nunca poderiam encontrar candidatos para uma query mascarada — `ExactDocumentMatchStrategy` tenta `CPF.create(query.documento)` primeiro, que sempre lança para um valor mascarado. Em vez de alterar esse caminho (que continua correto para o caso dele — comparação exata entre documentos completos), foram criados dois arquivos novos, zero modificação nos existentes:

- `PartyByNameIdentitySourceProvider`: busca candidatos por sobreposição de nome (via `findAll()`, ver abaixo) em vez de por documento.
- `PartialDocumentMatchStrategy`: produz dois `MatchSignal` independentes — `DOCUMENTO_PARCIAL` (peso 0.6, compara os 6 dígitos visíveis da máscara com a substring correspondente do documento completo do candidato) e `NOME_SIMILAR` (peso 0.4, via `nameSimilarity`, Jaccard de tokens — a mesma decisão de "não usar nada mais sofisticado que o necessário" já registrada no ADR 0013 para `ExactDocumentMatchStrategy`).

O `IdentityMatchScorer` (ADR 0013) não muda — os mesmos limiares (ALTA ≥ 0.8 → `MATCH`) decidem se a linha é considerada resolvida. Só uma decisão `MATCH` cria `Pessoa`/Dossiê automaticamente; `POSSIBLE_MATCH` fica como `SEM_CORRESPONDENCIA` (correspondência incerta não é "talvez resolvida" — é candidata a revisão manual, fora do escopo desta sprint).

### `findAll()` em `IPessoaRepository`/`IEmpresaRepository` — aditivo, com ressalva de escala

Necessário porque busca por nome não pode usar índice de documento. Implementado como `findMany()` sem paginação — aceitável para o volume atual, mas **não escala** para uma base grande de `Pessoa`/`Empresa`; fica registrado como item de backlog (ver Consequências) trocar por uma busca indexada (ex.: `pg_trgm`/full-text) antes de qualquer uso em produção com volume real.

### Classificação/Recomendação/Prompt permanecem _stateless_ e _on-demand_

Nenhum deles é chamado durante a importação. `GetImportDashboardUseCase` os invoca sob demanda, por dossiê já resolvido, exatamente como esses módulos já foram desenhados (ADRs 0016/0017/0018 — nenhuma mudança neles). Isso evita computar (e desatualizar) um resultado que ninguém pediu ainda, e mantém a importação em si rápida mesmo com muitas linhas.

### Cada linha resolvida cria um Dossiê novo — limitação conhecida

`ResolveImportRowIdentityUseCase` sempre chama `CreateDossieUseCase`, nunca verifica se já existe um Dossiê para aquele `subjectId`. Reimportar o mesmo arquivo (ou duas fontes apontando para a mesma Pessoa) cria Dossiês duplicados. Isso é consistente com uma lacuna já identificada em sprints anteriores (ausência de constraint de unicidade em `Dossie(subjectType, subjectId)`) e fica registrada aqui de novo, não resolvida nesta sprint — resolver as duas juntas é mais correto do que remendar só o lado da importação.

### `.xlsx` real via `xlsx` (SheetJS); parser localiza o cabeçalho por conteúdo, não por posição

`XlsxPgfnParser` não assume quantas linhas de metadados existem acima da tabela — procura a linha cuja primeira célula é literalmente `"CPF/CNPJ"`. Um export da PGFN com um bloco de filtros maior ou menor no topo continua funcionando sem mudança de código.

## Consequências

- Nenhuma `Pessoa` é criada a partir de uma linha importada. Isso é uma limitação real do produto enquanto a única fonte disponível mascarar o CPF — não um bug: o sistema recusa fabricar identidade que os dados não sustentam.
- O dashboard de uma importação real (sem cadastro prévio de `Pessoa`/`Empresa` que bata por nome) mostrará `quantidadeResolvidas: 0` e distribuições vazias — resultado honesto, não um placeholder quebrado.
- Backlog decorrente desta sprint: (1) paginar/indexar `findAll()` antes de uso em produção; (2) constraint de unicidade em `Dossie(subjectType, subjectId)` + `ResolveImportRowIdentityUseCase` reaproveitando um Dossiê existente em vez de sempre criar um novo; (3) uma tela/endpoint de revisão manual para linhas `SEM_CORRESPONDENCIA` e para decisões `POSSIBLE_MATCH` (hoje descartadas como se fossem `NO_MATCH`); (4) se uma segunda fonte com CPF completo aparecer no futuro, ela habilita criação automática de `Pessoa` sem exigir mudança no restante do pipeline — só um novo `IImportSourceParser` e, possivelmente, reativar a etapa de `RegisterPessoaUseCase` dentro do fluxo de resolução.
