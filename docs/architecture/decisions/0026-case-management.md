# 0026 — Case Management

## Status

Aceito e implementado

## Contexto

Sétima etapa do lote contínuo (5–15). Gestão completa do ciclo de cobrança: Case, status, owner, notas, histórico, follow-up, tags, prioridade, próxima ação, timeline — tudo persistido.

## Decisão

### Novo módulo `modules/case-management`, três agregados

`Case` (raiz), `CaseNote` e `CaseHistoryEntry` são agregados **separados**, cada um com repositório próprio — mesmo padrão de `ImportBatch`/`ImportRow` (ADR 0019) e `AuditLogEntry`/`AuditEvent` (ADR 0021): volume de escrita e ciclo de vida muito diferentes para valer travar o agregado `Case` a cada nota ou evento de timeline.

### Transições de status validadas por uma tabela fixa no domínio

`TRANSICOES_VALIDAS` (`Case.ts`) é a única fonte de verdade sobre quais mudanças de status são permitidas; `RESOLVIDO`/`CANCELADO` são terminais. Isso é deliberadamente **mais simples** do que um motor de workflow configurável — a Etapa 8 (`modules/workflow`, ADR 0027) adiciona um motor genérico para fluxos customizáveis sem recompilar, mas como **alternativa**, nunca substituindo esta validação padrão do ciclo de vida do Case.

### Timeline unifica todos os eventos relevantes, gerada automaticamente pelos próprios use cases

Criar o Case, mudar status, trocar owner/prioridade/tags/próxima ação, adicionar nota — cada ação grava sua própria entrada em `CaseHistoryEntry`, append-only. O cliente nunca precisa gerar a timeline manualmente; ela é um efeito colateral automático de cada use case, nunca uma reconstrução best-effort depois do fato.

### `UpdateCaseDetailsUseCase`: só gera evento para o que de fato mudou

Comparar o valor novo com o atual antes de aplicar e registrar evento evita ruído na timeline (ex.: reenviar o mesmo `ownerId` não gera um "OWNER_ALTERADO" vazio).

### Validação de existência do Dossiê na criação

Mesmo padrão de `CreateDossieUseCase` (dossie, ADR 0015): um Case só pode ser aberto para um `dossieId` que já existe (`IDossieRepository.findById`, leitura, sem modificar `dossie`).

## Consequências

- Migration `add_case_management_module`: models `Case`, `CaseNote`, `CaseHistoryEntry`, enums `CaseStatus`/`CasePriority`.
- Endpoints novos: `POST /cases`, `GET /cases`, `GET /cases/:id`, `PATCH /cases/:id/status`, `PATCH /cases/:id`, `POST /cases/:id/notes` — todos autenticados.
- Sem isolamento por tenant ainda (ver Etapa 9/ADR 0028) — qualquer usuário autenticado vê todos os Cases. Registrado como backlog.
- `ownerId`/`autorId` são referências soltas ao `User.id` (identity) — sem `@relation` no Prisma, mesmo padrão já usado em toda a plataforma para referências entre bounded contexts.
