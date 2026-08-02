# 0012 — Relacionamento Pessoa ↔ Empresa (participação societária)

## Status

Aceito e implementado

## Contexto

Sequência do [ADR 0011](0011-party-module-architecture.md): `Pessoa` e `Empresa` existiam sem nenhuma relação entre si. Este ADR registra como o relacionamento societário foi modelado — preparação para a futura consulta ao QSA (Quadro de Sócios e Administradores) da Receita Federal. Nenhuma integração externa foi feita nesta etapa.

## Decisão

### Agregado próprio, não um campo em `Pessoa`/`Empresa`

`ParticipacaoSocietaria` é um agregado independente dentro de `modules/party`, não um array `socios` dentro de `Empresa` nem um array `empresas` dentro de `Pessoa`. Isso evita que carregar uma `Empresa` implique carregar todos os seus sócios (e vice-versa) e mantém `Pessoa`/`Empresa` livres de qualquer conhecimento uma da outra — exatamente a preocupação de "não acoplar indevidamente" que motivou este ADR.

### Referência por FK no banco, por id no domínio

O schema Prisma usa `@relation` de verdade (`ParticipacaoSocietaria.pessoaId` → `Pessoa.id`, `ParticipacaoSocietaria.empresaId` → `Empresa.id`, com `onDelete: Cascade`) — o banco garante integridade referencial. A entidade de domínio `ParticipacaoSocietaria`, porém, só guarda `pessoaId`/`empresaId` como `string`, nunca um objeto `Pessoa`/`Empresa` carregado. Mesmo padrão de `Session.userId` em identity: relacionado no banco, desacoplado no domínio.

### Validação de existência no use case, não no banco

`RegisterParticipacaoSocietariaUseCase` busca `Pessoa`/`Empresa` pelos ids informados antes de criar o vínculo, devolvendo `AppError("VALIDATION", ...)` se algum não existir — em vez de deixar a violação de FK do Postgres estourar como erro 500. Isso exigiu adicionar `findById` a `IPessoaRepository`/`IEmpresaRepository` (ausente até aqui porque nada precisava; ver ADR 0011, que documentava esse método como deliberadamente omitido — deixa de ser omitido agora que há um uso real).

### QSA: papel fechado, percentual e datas opcionais

`PapelSocietario` é um enum fechado (`SOCIO`, `ADMINISTRADOR`, `SOCIO_ADMINISTRADOR`) — as qualificações mais comuns do QSA real. `percentualParticipacao` e `dataEntrada` são opcionais (`null` permitido) porque nem toda fonte de dados vai trazer essa informação. `dataSaida` começa `null` (participação ativa) e só é setada via `encerrar()` — nunca diretamente no cadastro.

### Sem enriquecimento de leitura

As consultas (`GET /participacoes-societarias?empresaId=`/`?pessoaId=`) devolvem só os ids e dados da própria participação — não fazem join para trazer o nome da pessoa ou a razão social da empresa. Isso é uma limitação deliberada desta etapa (ver Backlog Técnico), não um esquecimento.

## Consequências

- Sprint 4 em diante (Identity Resolution, Evidence, Dossiê) podem usar `ParticipacaoSocietaria` como uma das fontes de evidência de vínculo entre Pessoa e Empresa.
- Quando a consulta real ao QSA existir, o fluxo natural é: consultar a API externa → mapear o retorno para `RegisterParticipacaoSocietariaInput` → chamar o use case já existente. Nenhuma mudança de modelo é esperada só por isso.
- Se o produto precisar de uma tela mostrando "sócios de uma empresa com nome", a composição (buscar participações + buscar cada Pessoa) fica no controller ou em um use case de leitura dedicado — não deve virar um `@relation` de conveniência no Prisma.
