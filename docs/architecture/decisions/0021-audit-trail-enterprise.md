# 0021 — Audit Trail Enterprise

## Status

Aceito e implementado

## Contexto

Segunda etapa da evolução enterprise da plataforma. O requisito era: toda ação relevante (login, logout, criação de Pessoa/Empresa/Participação Societária, importação de planilha, criação de Dossiê, atualização de Evidência, execução de Identity Resolution, Classificação, Recomendação, Prompt e consulta de Explicação) deve gerar um evento auditável — com usuário, entidade afetada, payload, requestId, IP, user-agent, duração e sucesso/falha — consultável por período/usuário/tipo/entidade/sucesso, paginado e ordenado.

Restrição dura: nenhuma funcionalidade existente pode ser alterada; o Audit Trail deve **apenas observar** os módulos existentes.

### Descoberta importante: já existe um log de auditoria — de segurança, não de produto

Ao investigar o módulo `identity`, encontrei `AuditLogEntry`/`IAuditLogRepository`/`PrismaAuditLogRepository` (ADR 0007/0010) já implementados e em uso dentro de `LoginUseCase`, `LogoutUseCase`, `RefreshTokenUseCase`, `LogoutAllSessionsUseCase` e `RevokeSessionUseCase`, persistindo na tabela `audit_log_entries`. Esse mecanismo é **write-only** (só `append`, sem nenhum endpoint de consulta) e granular por design: ele existe para investigação de segurança interna, distinguindo motivos de falha de login (`LOGIN_FAILURE_BAD_PASSWORD` vs `LOGIN_FAILURE_ACCOUNT_LOCKED` vs `LOGIN_FAILURE_UNKNOWN_EMAIL`) que a resposta HTTP deliberadamente nunca expõe ao chamador (ADR 0010, "não vazar estado de conta").

Isso colocou uma decisão real: tentar unificar as duas fontes num único armazenamento, ou manter os dois, cada um com seu propósito? Decidi **não unificar** — ver "Decisão" abaixo.

## Decisão

### Novo módulo `modules/audit-trail`, mesma Clean Architecture

`domain/application/infrastructure/presentation/container.ts`, seguindo o mesmo padrão de todo o projeto (ADRs 0010/0011/0013/0016/0017/0018/0019/0020).

### Duas auditorias, dois propósitos, nenhuma delas superseder a outra

`AuditLogEntry` (identity) continua existindo e operando exatamente como antes — nenhuma linha desse módulo foi tocada. Este novo `AuditEvent` (audit-trail) é uma auditoria de **produto/compliance**, cobrindo toda a plataforma, com granularidade de "o que aconteceu, com qual entidade, em qual requisição" — não "por que uma tentativa de login específica falhou internamente". `LOGIN`/`LOGOUT` aparecem em **ambos** os logs, com informações diferentes e complementares; isso é intencional, não uma duplicação acidental. Ver "Consequências" para a limitação que essa escolha implica.

### Observação na fronteira HTTP — zero linha alterada em qualquer módulo de negócio

Em vez de injetar `IAuditEventRepository` dentro de cada use case existente (o que exigiria modificar `RegisterPessoaUseCase`, `CreateDossieUseCase`, etc. — proibido), o módulo expõe um único middleware Express genérico (`createAuditTrailMiddleware`), montado uma vez em `app.ts` antes das rotas de negócio. Ele:

1. Faz `monkey-patch` de `res.json`/`res.send` (mesma técnica usada por bibliotecas como `express-winston`) só para capturar uma referência ao corpo da resposta — nunca altera o que é enviado ao cliente.
2. No evento `res.on("finish")` (depois que o controller real já respondeu), verifica se `${req.baseUrl}${req.route.path}` bate com uma das treze rotas em `AUDITABLE_ROUTES` (`presentation/middlewares/auditableRoutes.ts`). Rotas fora dessa lista não geram nenhum evento.
3. Se bater, extrai `usuarioId`/`entidadeId`/payload usando as funções daquela entrada específica, grava via `RecordAuditEventUseCase` — de forma assíncrona (fire-and-forget), nunca bloqueando ou alterando a resposta real. Uma falha ao gravar o evento é só logada (`logger.error`), nunca propagada ao cliente.

Isso satisfaz literalmente "observar, não alterar": o middleware nunca chama nenhum use case dos módulos observados, só lê o que a requisição/resposta já produziram por conta própria.

### `AUDITABLE_ROUTES`: cada entrada só afirma o que a rota de fato expõe

Nenhum campo é inferido quando a informação não existe de verdade na requisição/resposta:

- **`LOGOUT`** usa só o cookie de refresh token (nunca `Authorization: Bearer`), e o controller responde `204` sem corpo — não há como saber o usuário na fronteira HTTP sem duplicar a lógica de resolução de sessão de `identity` (proibido). `usuarioId`/`entidadeId` ficam `null`, documentado como limitação deliberada — não um bug. Quem precisar de "qual usuário fez logout" tem essa resposta no log interno de `identity` (`AuditLogEntry`, evento `LOGOUT`).
- **`IDENTITY_RESOLUTION_EXECUTADA`** não persiste nenhuma entidade própria — `entidadeId` é `null` de propósito (é uma consulta, não uma mutação).
- **`PLANILHA_IMPORTADA`** nunca grava o buffer do arquivo — só `nomeArquivo`/`tamanhoBytes` (`req.file`, via multer).

### `PayloadRedactor`: mesma disciplina de redaction do Pino (ADR 0006), aplicada aqui

Antes de persistir, o payload capturado (requisição + resposta) passa por `PayloadRedactor.redact`, que substitui por `[REDACTED]` qualquer campo cujo nome (case-insensitive) seja `password`/`senha`/`token`/`accessToken`/`refreshToken`/`authorization`/`passwordHash`/`tokenHash`/`cookie`. CPF/CNPJ **não** são redigidos — já são gravados em texto puro em `party` hoje, então mascará-los aqui criaria uma falsa sensação de proteção inconsistente com o resto da plataforma.

### Armazenamento próprio, único, com índices e paginação reais

Uma tabela nova (`audit_events`, model `AuditEvent`) com índices em `timestamp`, `usuarioId`, `tipo`, `(entidade, entidadeId)` e `requestId` — paginação/ordenação/filtros resolvidos via SQL real (`Prisma.AuditEventWhereInput` + `skip`/`take`/`orderBy`), não em memória. Nome do enum de outcome no Prisma é `AuditEventOutcome` (não `AuditOutcome`) para não colidir com o enum já existente de `identity`.

### Cinco endpoints de leitura, todos autenticados, sem duplicar lógica de negócio

`GET /audit` (filtros: `desde`/`ate`/`usuarioId`/`tipo`/`entidade`/`sucesso`, + paginação/ordenação), `GET /audit/:id`, `GET /audit/entity/:entity/:id`, `GET /audit/user/:userId`, `GET /audit/request/:requestId`. Cada um só delega a um use case fino que chama o repositório — nenhuma regra de negócio nova.

## Consequências

- `LOGOUT` é o único dos treze eventos com `usuarioId`/`entidadeId` sempre `null` neste log — limitação conhecida e documentada, não um bug a esconder. Fechar essa lacuna exigiria que `LogoutController`/`LogoutUseCase` (identity) passassem a devolver o `userId` na resposta — mudança em módulo aprovado, fora do escopo desta etapa.
- Duas tabelas de auditoria (`audit_log_entries` de identity, `audit_events` deste módulo) convivem de propósito. Uma consulta que precise ver "tudo sobre um usuário" hoje exige consultar as duas — não implementado aqui; fica registrado como backlog caso vire necessidade real.
- O middleware audita só as treze rotas listadas — uma rota nova de negócio não aparece na auditoria até alguém adicionar uma entrada em `AUDITABLE_ROUTES`. É uma sincronização manual deliberada (mesmo espírito do `FatorSourceMapper`, ADR 0020): falhar silenciosamente por omissão seria peor do que exigir esse passo explícito.
- Nenhuma alteração de comportamento em nenhum módulo observado — confirmado pelos 291 testes anteriores continuando verdes (ver evidências no relatório da Etapa 1) mais os novos testes desta etapa.
