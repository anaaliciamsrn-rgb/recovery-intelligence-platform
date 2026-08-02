# 0032 — Scheduler

## Status

Aceito e implementado — **motor real, disparado externamente por decisão explícita** (ver "Sem timer interno" abaixo)

## Contexto

Décima terceira etapa do lote contínuo (5–15). O pedido: jobs internos, agendamento, retry, dead letter, histórico, execuções.

## Decisão

`modules/scheduler` — dois agregados:

- **`ScheduledJob`** — `nome`, `tipo` (string livre — identifica qual handler processa o job, nunca uma classe nova por job), `payload` (Json), `status` (`PENDENTE | EXECUTANDO | CONCLUIDO | MORTO`), `agendadoPara`, `tentativas`/`maxTentativas`, `ultimoErro`.
- **`JobExecutionEntry`** — histórico append-only de cada tentativa (sucesso ou falha), com duração — "histórico de execuções" do requisito.

### Retry com backoff exponencial e fila-morta (`MORTO`)

`JobRetryPolicy.calcularProximaTentativa` (domínio, puro) devolve a próxima `agendadoPara` com backoff exponencial (30s, 60s, 120s... até um teto de 1h) enquanto `tentativas < maxTentativas`; ao esgotar, devolve `null` — o job entra em `MORTO`. Um job `MORTO` nunca é apagado: fica visível via `GET /scheduler/jobs?status=MORTO` para investigação manual, exatamente o papel de uma fila-morta.

### `IJobHandlerRegistry` — o motor nunca conhece um handler concreto

`RunDueJobsUseCase` resolve o handler pelo `tipo` do job via `IJobHandlerRegistry.resolve(tipo)` — um port simples, implementado nesta etapa por `InMemoryJobHandlerRegistry` (infra, vive só enquanto o processo roda). Um `tipo` sem handler registrado é tratado como qualquer outra falha: aciona a mesma política de retry/dead-letter, nunca crasha o motor.

### Sem timer interno — motor disparado por chamada explícita

`RunDueJobsUseCase` não é acionado por um `setInterval` do próprio processo. Um scheduler real (como `ProcessMetricsProvider`, que já usa `setInterval().unref()` neste código) seria a opção natural, mas foi deliberadamente rejeitada aqui por dois motivos: (1) o container é reconstruído em cada arquivo de teste de integração (`buildContainer()`) e um timer não descartado explicitamente continuaria batendo no mesmo Postgres real enquanto arquivos de teste _seguintes_ rodam — exatamente a classe de corrida entre-suítes já identificada e corrigida nesta sessão para o teste de `analytics` (ver `jest.config.cjs`, `maxWorkers: 1`); um timer de scheduler reintroduziria o mesmo risco por um caminho diferente. (2) muitos schedulers de produção reais já funcionam assim — um cron de infraestrutura chamando um endpoint HTTP — então expor `POST /scheduler/jobs/run-due` como o "tick" é uma escolha arquitetural legítima, não um atalho.

### Endpoints

`POST /scheduler/jobs` (agendar), `GET /scheduler/jobs` (listar, filtra por `status`), `GET /scheduler/jobs/:id` (detalhe + histórico completo de execuções), `POST /scheduler/jobs/run-due` (processa todos os jobs devidos agora — o "tick" do motor).

### RBAC (ADR 0029)

`scheduler:read` e `scheduler:write` (agendar e disparar `run-due` — disparar o motor é uma operação, não uma leitura). `ADMIN`/`MANAGER` têm ambas; `AUDITOR` só leitura; `COLLECTOR`/`ANALYST`/`VIEWER` nenhuma.

## Limitação de escopo (registrada explicitamente, não escondida)

- **Nenhum módulo de negócio registra um handler em `InMemoryJobHandlerRegistry`.** A infraestrutura de execução, retry e dead-letter é real e funcional (comprovada pelo teste de integração, que agenda um job sem handler e prova que ele vai para `MORTO` na tentativa esgotada), mas nenhum job de negócio (ex.: lembrete de follow-up de um `Case`) foi conectado — conectar um exigiria que aquele módulo aprovado passasse a depender deste, decisão de produto fora do escopo de "só adicionar".
- Sem timer interno, `run-due` precisa de um chamador externo (cron de infraestrutura, ou um operador) para processar jobs devidos — documentado acima, não uma omissão silenciosa.

## Consequências

- Migration `add_scheduler_module`: models `ScheduledJob`, `JobExecutionEntry`, enums `ScheduledJobStatus`/`JobExecutionStatus`.
- Endpoints novos: `POST /scheduler/jobs`, `GET /scheduler/jobs`, `GET /scheduler/jobs/:id`, `POST /scheduler/jobs/run-due`.
- Backlog explícito: registrar handlers reais para jobs de negócio (ex.: lembretes de `Case`) e decidir se/como acionar `run-due` automaticamente em produção (cron de infraestrutura) são decisões de produto separadas.
