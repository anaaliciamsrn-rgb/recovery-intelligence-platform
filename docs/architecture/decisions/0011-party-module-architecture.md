# 0011 — Módulo Party: cadastro/consulta de Pessoa e Empresa

## Status

Aceito e implementado

## Contexto

Primeira feature de negócio construída sobre a fundação de Identity ([ADR 0010](0010-identity-module-architecture.md)). É o bounded context já sinalizado desde a sprint de Identity — o comentário em `User.ts` previa: _"Pessoa/Empresa (o sujeito consultado — bounded context futuro, sem relação com este)"_. Score e Dossiê (próximas features do roadmap) não têm o que referenciar sem esta entidade existir primeiro.

## Decisão

### Dois agregados independentes, um módulo

`Pessoa` (CPF) e `Empresa` (CNPJ) vivem no mesmo módulo (`modules/party`), mas **não se referenciam entre si em nenhuma camada** — nem campo de domínio, nem repositório, nem use case. Cada um tem sua própria árvore de VO/entidade/repositório/use cases/controller/rotas dentro do módulo. A única coisa que compartilham é o container do módulo (`container.ts`) e o middleware de autenticação.

### Vínculos societários (QSA) — não implementado, não modelado

`Empresa` não tem nenhum campo relacionando-a a `Pessoa` (ex.: um array de sócios). Isso é intencional: consulta ao QSA (Quadro de Sócios e Administradores) é uma feature futura, com sua própria decisão de modelagem quando existir — adicionar um campo especulativo hoje (vazio, sem uso real) seria acoplamento prematuro entre os dois agregados. Mesmo raciocínio do `User.mfaEnabled` no ADR 0007, mas aqui a decisão é não adicionar nenhum campo, só documentar a intenção.

### CPF/CNPJ como Value Objects com validação real

`CPF`/`CNPJ` normalizam (removem pontuação) e validam pelo algoritmo de dígito verificador mod-11 — não é checagem de formato. Sequências com todos os dígitos iguais (`"11111111111"`) são rejeitadas explicitamente, mesmo quando o mod-11 aceitaria matematicamente. Mesmo padrão de `Email`/`PlainPassword` em identity: a validação de negócio vive no domínio, não no validador Zod da rota (que só garante forma/tamanho).

### Ports próprios do módulo (`IIdGenerator`, `IClock`)

Duplicados localmente em `modules/party/application/ports`, em vez de importados de `modules/identity`. Mesma decisão do ADR 0010: cada bounded context tem sua árvore completa. `IIdGenerator` aqui é mais estreito que o de identity (só `generateId`, sem `generateSecureToken` — não há necessidade de token opaco de alta entropia neste módulo).

### Reaproveitamento do `authenticateMiddleware` de identity

As rotas de `party` exigem um access token válido. Em vez de duplicar a lógica de verificação de JWT, o container do módulo importa `createAuthenticateMiddleware` de `modules/identity/presentation/middlewares` (sem mover ou alterar o arquivo) e instancia seu próprio `JwtTokenProvider(env)` — stateless, mesmo segredo do env, sem precisar expor a instância interna de identity. Isso é exatamente o motivo de `ITokenProvider` ter sido mantido no shared kernel (`application/ports`, `infrastructure/security`) desde o ADR 0010: "capacidades genéricas o suficiente para outros módulos futuros reutilizarem".

Nenhuma checagem de permissão granular (RBAC por `Permission`) foi adicionada — qualquer usuário autenticado pode cadastrar/consultar. Refinamento de RBAC por papel fica registrado como backlog técnico, não implementado nesta fase.

### Sem auditoria de negócio

`AuditLogEntry` é uma entidade interna de `identity` (eventos de autenticação — login, logout, revogação de sessão). Reaproveitá-la para eventos de `party` acoplaria os dois domínios via uma entidade de domínio compartilhada, o que a Clean Architecture do projeto não prevê (entidades são propriedade exclusiva do seu bounded context). Auditoria de ações de negócio, se necessária, é decisão de uma feature própria — não implementada aqui.

## Consequências

- `Score` e `Dossiê` (próximas features) passam a ter `Pessoa.id`/`Empresa.id` para referenciar.
- Consulta ao QSA, quando implementada, precisa decidir onde vive a referência `Empresa → Pessoa` (provavelmente uma tabela de associação própria, não um campo em `Empresa`) — decisão explicitamente deixada para quando essa feature existir.
- CPF/CNPJ são armazenados normalizados (só dígitos) e únicos no banco — mesma disciplina de normalização do `Email` em identity.
