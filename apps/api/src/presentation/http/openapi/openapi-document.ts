/**
 * Documento OpenAPI 3.0 servido em `/api/v1/docs` (Swagger UI) e
 * `/api/v1/openapi.json` (raw). Escrito à mão em TypeScript (não gerado a
 * partir dos schemas Zod) — cobre todos os ~95 endpoints reais da
 * plataforma, com segurança, parâmetros e forma de request/response.
 * Schemas de resposta são representativos (campos principais), não
 * exaustivos campo-a-campo — o objetivo é uma referência navegável e
 * correta da API, não geração de cliente.
 *
 * Mantido manualmente: ao adicionar uma rota nova em qualquer módulo,
 * adicione o path correspondente aqui na mesma revisão (mesmo espírito de
 * "todo endpoint documentado" já seguido pelas ADRs).
 */

type JsonSchema = Record<string, unknown>;

const bearerAuth = [{ bearerAuth: [] as string[] }];

function errorResponse(description: string): JsonSchema {
  return {
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
  };
}

const STANDARD_ERRORS = {
  400: errorResponse("Erro de validação"),
  401: errorResponse("Não autenticado"),
  403: errorResponse("Permissão insuficiente"),
  404: errorResponse("Recurso não encontrado"),
};

function jsonBody(schema: JsonSchema, required = true) {
  return { required, content: { "application/json": { schema } } };
}

function okResponse(description: string, schema: JsonSchema) {
  return { description, content: { "application/json": { schema } } };
}

function pathParam(name: string, description: string, schema: JsonSchema = { type: "string" }) {
  return { name, in: "path", required: true, description, schema };
}

function queryParam(name: string, description: string, schema: JsonSchema = { type: "string" }) {
  return { name, in: "query", required: false, description, schema };
}

const PAGE_PARAMS = [
  queryParam("page", "Número da página (1-based)", { type: "integer", minimum: 1, default: 1 }),
  queryParam("pageSize", "Itens por página", {
    type: "integer",
    minimum: 1,
    maximum: 200,
    default: 50,
  }),
];

function pagedResponse(itemSchema: JsonSchema): JsonSchema {
  return {
    type: "object",
    properties: {
      items: { type: "array", items: itemSchema },
      total: { type: "integer" },
      page: { type: "integer" },
      pageSize: { type: "integer" },
    },
  };
}

const ref = (name: string): JsonSchema => ({ $ref: `#/components/schemas/${name}` });

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Recovery Intelligence Platform API",
    version: "1.0.0",
    description:
      "API enterprise de inteligência para consulta e recuperação de crédito de pessoas físicas e jurídicas. " +
      "20 módulos em Clean Architecture (DDD), RBAC granular, auditoria completa e versionamento de dossiês. " +
      "Todas as rotas (exceto `/health`, `/auth/login`, `/auth/refresh`, `/auth/logout`) exigem `Authorization: Bearer <token>`.",
    contact: { name: "Recovery Intelligence Platform" },
  },
  servers: [
    { url: "http://localhost:3000/api/v1", description: "Desenvolvimento local" },
    {
      url: "https://{host}/api/v1",
      description: "Produção",
      variables: { host: { default: "api.example.com" } },
    },
  ],
  tags: [
    { name: "Health", description: "Saúde do sistema" },
    { name: "Auth", description: "Autenticação, sessões e RBAC" },
    { name: "Party", description: "Pessoas, Empresas e participação societária" },
    { name: "Identity Resolution", description: "Resolução de identidade entre fontes" },
    { name: "Dossie", description: "Dossiê base e evidências" },
    { name: "Classification", description: "Motor de classificação de risco" },
    { name: "Recommendation", description: "Motor de recomendação de canal de cobrança" },
    { name: "Prompt Builder", description: "Geração de prompts para IA generativa" },
    { name: "Import", description: "Importação profissional de planilhas (PGFN)" },
    { name: "Explainability", description: "Explicabilidade da classificação" },
    { name: "Audit Trail", description: "Auditoria enterprise (append-only)" },
    { name: "Dossier Versioning", description: "Versionamento e histórico do dossiê" },
    { name: "Simulation", description: "Laboratório de simulação de decisão" },
    { name: "Confidence Heatmap", description: "Heatmap de confiança por fonte" },
    { name: "Analytics", description: "KPIs agregados da plataforma" },
    { name: "Case Management", description: "Gestão de casos de cobrança" },
    { name: "Workflow", description: "Motor de workflow configurável" },
    { name: "Tenant", description: "Fundação multi-tenant" },
    { name: "Rule Builder", description: "Motor de regras configuráveis" },
    { name: "Feature Flags", description: "Flags por tenant/ambiente/usuário" },
    { name: "Scheduler", description: "Jobs agendados com retry e fila-morta" },
    { name: "Cache", description: "Cache-aside sobre Redis" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              kind: {
                type: "string",
                enum: [
                  "VALIDATION",
                  "UNAUTHORIZED",
                  "FORBIDDEN",
                  "NOT_FOUND",
                  "CONFLICT",
                  "INTERNAL",
                ],
              },
              message: { type: "string" },
              details: { type: "object", additionalProperties: true, nullable: true },
            },
          },
          requestId: { type: "string" },
        },
      },
      Health: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          dependencies: {
            type: "object",
            properties: { database: { type: "string" }, cache: { type: "string" } },
          },
        },
      },
      Case: {
        type: "object",
        properties: {
          id: { type: "string" },
          dossieId: { type: "string" },
          status: {
            type: "string",
            enum: [
              "ABERTO",
              "EM_ANDAMENTO",
              "AGUARDANDO_RETORNO",
              "NEGOCIACAO",
              "RESOLVIDO",
              "CANCELADO",
            ],
          },
          ownerId: { type: "string", nullable: true },
          priority: { type: "string", enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"] },
          tags: { type: "array", items: { type: "string" } },
          proximaAcao: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      WorkflowDefinitionInput: {
        type: "object",
        required: ["nome", "estados", "estadoInicial", "transicoes"],
        properties: {
          nome: { type: "string" },
          descricao: { type: "string", nullable: true },
          estados: { type: "array", items: { type: "string" } },
          estadoInicial: { type: "string" },
          transicoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                de: { type: "string" },
                para: { type: "string" },
                gatilho: { type: "string" },
                condicao: { type: "object", nullable: true },
                acao: { type: "string", nullable: true },
              },
            },
          },
        },
      },
      WorkflowDefinition: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          estados: { type: "array", items: { type: "string" } },
          estadoInicial: { type: "string" },
          ativo: { type: "boolean" },
          transicoes: { type: "array", items: { type: "object" } },
        },
      },
      Tenant: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          slug: { type: "string" },
          ativo: { type: "boolean" },
        },
      },
      RuleDefinitionInput: {
        type: "object",
        required: ["nome", "recurso", "condicoes", "peso", "prioridade", "acao"],
        properties: {
          nome: { type: "string" },
          descricao: { type: "string", nullable: true },
          recurso: { type: "string" },
          condicoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                campo: { type: "string" },
                operador: {
                  type: "string",
                  enum: ["IGUAL", "DIFERENTE", "MAIOR_QUE", "MENOR_QUE"],
                },
                valor: {},
              },
            },
          },
          peso: { type: "number" },
          prioridade: { type: "integer" },
          acao: { type: "string" },
          ativo: { type: "boolean" },
        },
      },
      RuleDefinition: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          recurso: { type: "string" },
          peso: { type: "number" },
          prioridade: { type: "integer" },
          acao: { type: "string" },
          ativo: { type: "boolean" },
          versaoAtual: { type: "integer" },
        },
      },
      FeatureFlag: {
        type: "object",
        properties: {
          id: { type: "string" },
          chave: { type: "string" },
          descricao: { type: "string", nullable: true },
          ativoPadrao: { type: "boolean" },
        },
      },
      ScheduledJob: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          tipo: { type: "string" },
          status: { type: "string", enum: ["PENDENTE", "EXECUTANDO", "CONCLUIDO", "MORTO"] },
          agendadoPara: { type: "string", format: "date-time" },
          tentativas: { type: "integer" },
          maxTentativas: { type: "integer" },
          ultimoErro: { type: "string", nullable: true },
        },
      },
    },
  },
  security: bearerAuth,
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Verifica saúde da API e dependências (Postgres, Redis)",
        security: [],
        responses: { 200: okResponse("Sistema saudável", ref("Health")) },
      },
    },

    // ---------------- Auth ----------------
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login — devolve access token (corpo) e refresh token (cookie httpOnly)",
        security: [],
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        }),
        responses: {
          200: okResponse("Autenticado", {
            type: "object",
            properties: { accessToken: { type: "string" }, user: { type: "object" } },
          }),
          401: errorResponse("Credenciais inválidas"),
          429: errorResponse("Rate limit de login excedido"),
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotaciona o refresh token (lido do cookie) e emite novo access token",
        security: [],
        responses: {
          200: okResponse("Token renovado", {
            type: "object",
            properties: { accessToken: { type: "string" } },
          }),
          401: errorResponse("Refresh token inválido, expirado ou reutilizado"),
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoga a sessão atual (via cookie)",
        security: [],
        responses: { 204: { description: "Sessão revogada" } },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Revoga todas as sessões do usuário autenticado",
        security: bearerAuth,
        responses: { 204: { description: "Todas as sessões revogadas" }, ...STANDARD_ERRORS },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary:
          "Perfil do usuário autenticado (id, email, roles) — usado para reidratar a sessão após reload",
        security: bearerAuth,
        responses: {
          200: okResponse("Usuário atual", {
            type: "object",
            properties: {
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  email: { type: "string" },
                  roles: { type: "array", items: { type: "string" } },
                },
              },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/auth/sessions": {
      get: {
        tags: ["Auth"],
        summary: "Lista sessões ativas do usuário autenticado",
        security: bearerAuth,
        responses: {
          200: okResponse("Sessões", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/auth/sessions/{sessionId}": {
      delete: {
        tags: ["Auth"],
        summary:
          "Revoga uma sessão específica (própria, ou de outro usuário com permissão de admin)",
        security: bearerAuth,
        parameters: [pathParam("sessionId", "ID da sessão")],
        responses: { 204: { description: "Sessão revogada" }, ...STANDARD_ERRORS },
      },
    },

    // ---------------- Party ----------------
    "/pessoas": {
      post: {
        tags: ["Party"],
        summary: "Cadastra uma Pessoa (CPF)",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["cpf", "nome"],
          properties: { cpf: { type: "string" }, nome: { type: "string" } },
        }),
        responses: {
          201: okResponse("Pessoa criada", { type: "object" }),
          ...STANDARD_ERRORS,
          409: errorResponse("CPF já cadastrado"),
        },
      },
    },
    "/pessoas/{cpf}": {
      get: {
        tags: ["Party"],
        summary: "Consulta Pessoa por CPF",
        security: bearerAuth,
        parameters: [pathParam("cpf", "CPF (11 dígitos)")],
        responses: { 200: okResponse("Pessoa", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/pessoas/id/{id}": {
      get: {
        tags: ["Party"],
        summary:
          "Consulta Pessoa por ID — resolve o outro lado de um vínculo (ex.: participação societária) para exibição",
        security: bearerAuth,
        parameters: [pathParam("id", "ID interno da Pessoa")],
        responses: { 200: okResponse("Pessoa", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/empresas": {
      post: {
        tags: ["Party"],
        summary: "Cadastra uma Empresa (CNPJ)",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["cnpj", "razaoSocial"],
          properties: { cnpj: { type: "string" }, razaoSocial: { type: "string" } },
        }),
        responses: {
          201: okResponse("Empresa criada", { type: "object" }),
          ...STANDARD_ERRORS,
          409: errorResponse("CNPJ já cadastrado"),
        },
      },
    },
    "/empresas/{cnpj}": {
      get: {
        tags: ["Party"],
        summary: "Consulta Empresa por CNPJ",
        security: bearerAuth,
        parameters: [pathParam("cnpj", "CNPJ (14 dígitos)")],
        responses: { 200: okResponse("Empresa", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/empresas/id/{id}": {
      get: {
        tags: ["Party"],
        summary: "Consulta Empresa por ID — resolve o outro lado de um vínculo para exibição",
        security: bearerAuth,
        parameters: [pathParam("id", "ID interno da Empresa")],
        responses: { 200: okResponse("Empresa", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/participacoes-societarias": {
      post: {
        tags: ["Party"],
        summary: "Registra participação societária de uma Pessoa em uma Empresa",
        security: bearerAuth,
        requestBody: jsonBody({ type: "object" }),
        responses: {
          201: okResponse("Participação registrada", { type: "object" }),
          ...STANDARD_ERRORS,
        },
      },
      get: {
        tags: ["Party"],
        summary: "Lista participações societárias",
        security: bearerAuth,
        responses: {
          200: okResponse("Participações", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/participacoes-societarias/{id}/encerrar": {
      post: {
        tags: ["Party"],
        summary: "Encerra uma participação societária",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da participação")],
        responses: { 204: { description: "Encerrada" }, ...STANDARD_ERRORS },
      },
    },

    // ---------------- Identity Resolution ----------------
    "/identity-resolution/resolve": {
      post: {
        tags: ["Identity Resolution"],
        summary:
          "Resolve a identidade de um documento (completo ou mascarado) contra o cadastro interno",
        security: bearerAuth,
        requestBody: jsonBody({ type: "object" }),
        responses: {
          200: okResponse("Resultado da resolução", { type: "object" }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Dossie ----------------
    "/dossies": {
      post: {
        tags: ["Dossie"],
        summary: "Cria um dossiê para uma Pessoa ou Empresa",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["subjectType", "subjectId"],
          properties: {
            subjectType: { type: "string", enum: ["PESSOA", "EMPRESA"] },
            subjectId: { type: "string" },
          },
        }),
        responses: { 201: okResponse("Dossiê criado", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/dossies/{id}": {
      get: {
        tags: ["Dossie"],
        summary: "Consulta um dossiê com todas as evidências",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do dossiê")],
        responses: { 200: okResponse("Dossiê", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/dossies/{id}/evidencias": {
      post: {
        tags: ["Dossie"],
        summary: "Registra uma evidência de uma fonte externa no dossiê",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do dossiê")],
        requestBody: jsonBody({
          type: "object",
          required: ["fonte", "status"],
          properties: {
            fonte: { type: "string" },
            status: { type: "string", enum: ["ENCONTRADO", "NAO_ENCONTRADO", "ERRO"] },
            valor: { type: "object" },
            confidenceScore: { type: "number" },
          },
        }),
        responses: {
          201: okResponse("Evidência registrada", { type: "object" }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Classification / Explainability / Recommendation / Prompt Builder ----------------
    "/classificacoes/{dossieId}": {
      get: {
        tags: ["Classification"],
        summary: "Classifica o risco de um dossiê (motor de regras hardcoded explicável)",
        security: bearerAuth,
        parameters: [pathParam("dossieId", "ID do dossiê")],
        responses: {
          200: okResponse("Classificação", {
            type: "object",
            properties: {
              classificacao: { type: "string" },
              score: { type: "number" },
              fatores: { type: "array", items: { type: "object" } },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/classification/{id}/explanation": {
      get: {
        tags: ["Explainability"],
        summary:
          "Explica, fator a fator e fonte a fonte, por que um dossiê recebeu sua classificação",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do dossiê")],
        responses: { 200: okResponse("Explicação", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/recomendacoes/{dossieId}": {
      get: {
        tags: ["Recommendation"],
        summary: "Gera recomendações de canal/estratégia de cobrança para um dossiê",
        security: bearerAuth,
        parameters: [pathParam("dossieId", "ID do dossiê")],
        responses: {
          200: okResponse("Recomendações", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/prompts/{dossieId}": {
      get: {
        tags: ["Prompt Builder"],
        summary: "Monta um prompt estruturado para IA generativa a partir do dossiê",
        security: bearerAuth,
        parameters: [pathParam("dossieId", "ID do dossiê")],
        responses: {
          200: okResponse("Prompt", { type: "object", properties: { prompt: { type: "string" } } }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Import ----------------
    "/imports": {
      post: {
        tags: ["Import"],
        summary:
          "Importa uma planilha PGFN (multipart, campo 'file') — valida, deduplica, resolve identidade e cria dossiês automaticamente",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          201: okResponse("Importação concluída", {
            type: "object",
            properties: {
              importBatchId: { type: "string" },
              totalLinhas: { type: "integer" },
              contagens: { type: "object" },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
      get: {
        tags: ["Import"],
        summary: "Histórico de importações (lotes), paginado",
        security: bearerAuth,
        parameters: PAGE_PARAMS,
        responses: {
          200: okResponse("Lotes", pagedResponse({ type: "object" })),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/imports/preview": {
      post: {
        tags: ["Import"],
        summary: "Preview/dry-run — valida e detecta duplicados sem persistir nada",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          200: okResponse("Resultado do preview", {
            type: "object",
            properties: {
              totalLinhas: { type: "integer" },
              contagens: { type: "object" },
              linhas: { type: "array", items: { type: "object" } },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/imports/{id}/dashboard": {
      get: {
        tags: ["Import"],
        summary:
          "Dashboard de um lote de importação (identidade resolvida, dossiês, distribuição de risco)",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do lote")],
        responses: { 200: okResponse("Dashboard", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/imports/{id}/relatorio": {
      get: {
        tags: ["Import"],
        summary: "Relatório final do lote — clientes importados/rejeitados e resumo executivo",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do lote")],
        responses: { 200: okResponse("Relatório", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/imports/{id}/rollback": {
      post: {
        tags: ["Import"],
        summary: "Reversão lógica de um lote — nunca apaga as linhas, só sinaliza REVERTIDO",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do lote")],
        requestBody: jsonBody({
          type: "object",
          required: ["motivo"],
          properties: { motivo: { type: "string" } },
        }),
        responses: {
          200: okResponse("Lote revertido", { type: "object" }),
          ...STANDARD_ERRORS,
          409: errorResponse("Lote já revertido"),
        },
      },
    },

    // ---------------- Audit Trail ----------------
    "/audit": {
      get: {
        tags: ["Audit Trail"],
        summary: "Lista eventos de auditoria (mais recentes primeiro)",
        security: bearerAuth,
        responses: {
          200: okResponse("Eventos", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/audit/entity/{entity}/{id}": {
      get: {
        tags: ["Audit Trail"],
        summary: "Eventos de auditoria de uma entidade específica",
        security: bearerAuth,
        parameters: [pathParam("entity", "Tipo da entidade"), pathParam("id", "ID da entidade")],
        responses: {
          200: okResponse("Eventos", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/audit/user/{userId}": {
      get: {
        tags: ["Audit Trail"],
        summary: "Eventos de auditoria disparados por um usuário",
        security: bearerAuth,
        parameters: [pathParam("userId", "ID do usuário")],
        responses: {
          200: okResponse("Eventos", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/audit/request/{requestId}": {
      get: {
        tags: ["Audit Trail"],
        summary:
          "Eventos de auditoria de uma requisição HTTP específica (correlação por X-Request-Id)",
        security: bearerAuth,
        parameters: [pathParam("requestId", "Request ID")],
        responses: {
          200: okResponse("Eventos", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/audit/{id}": {
      get: {
        tags: ["Audit Trail"],
        summary: "Consulta um evento de auditoria por ID",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do evento")],
        responses: { 200: okResponse("Evento", { type: "object" }), ...STANDARD_ERRORS },
      },
    },

    // ---------------- Dossier Versioning ----------------
    "/dossiers/{id}/history": {
      get: {
        tags: ["Dossier Versioning"],
        summary: "Histórico completo de versões (snapshots) de um dossiê",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do dossiê")],
        responses: {
          200: okResponse("Histórico", { type: "array", items: { type: "object" } }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/dossiers/{id}/history/{version}": {
      get: {
        tags: ["Dossier Versioning"],
        summary: "Snapshot de uma versão específica do dossiê",
        security: bearerAuth,
        parameters: [
          pathParam("id", "ID do dossiê"),
          pathParam("version", "Número da versão", { type: "integer" }),
        ],
        responses: { 200: okResponse("Snapshot", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/dossiers/{id}/diff/{v1}/{v2}": {
      get: {
        tags: ["Dossier Versioning"],
        summary: "Diff entre duas versões do dossiê",
        security: bearerAuth,
        parameters: [
          pathParam("id", "ID do dossiê"),
          pathParam("v1", "Versão base", { type: "integer" }),
          pathParam("v2", "Versão comparada", { type: "integer" }),
        ],
        responses: { 200: okResponse("Diff", { type: "object" }), ...STANDARD_ERRORS },
      },
    },

    // ---------------- Simulation ----------------
    "/simulation": {
      post: {
        tags: ["Simulation"],
        summary:
          "Simula o impacto de mudanças hipotéticas de evidência na classificação, sem persistir nada",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["dossieId", "changes"],
          properties: {
            dossieId: { type: "string" },
            changes: { type: "array", items: { type: "object" } },
          },
        }),
        responses: {
          200: okResponse("Resultado da simulação", { type: "object" }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Confidence Heatmap ----------------
    "/confidence-heatmap/{dossieId}": {
      get: {
        tags: ["Confidence Heatmap"],
        summary: "Heatmap de confiança por fonte de um dossiê",
        security: bearerAuth,
        parameters: [pathParam("dossieId", "ID do dossiê")],
        responses: {
          200: okResponse("Heatmap", {
            type: "object",
            properties: {
              classificacao: { type: "string" },
              fontes: { type: "array", items: { type: "object" } },
              fontesAusentes: { type: "array", items: { type: "string" } },
              confiancaAgregada: { type: "number" },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Analytics ----------------
    "/analytics/summary": {
      get: {
        tags: ["Analytics"],
        summary: "KPIs agregados da plataforma inteira",
        security: bearerAuth,
        responses: {
          200: okResponse("Resumo", {
            type: "object",
            properties: {
              totalPessoas: { type: "integer" },
              totalDossiesAnalisados: { type: "integer" },
              distribuicaoRisco: { type: "object" },
              metricasPorFonte: { type: "array", items: { type: "object" } },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Case Management ----------------
    "/cases": {
      post: {
        tags: ["Case Management"],
        summary: "Cria um case de cobrança para um dossiê",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["dossieId"],
          properties: {
            dossieId: { type: "string" },
            priority: { type: "string", enum: ["BAIXA", "MEDIA", "ALTA", "URGENTE"] },
          },
        }),
        responses: { 201: okResponse("Case criado", ref("Case")), ...STANDARD_ERRORS },
      },
      get: {
        tags: ["Case Management"],
        summary: "Lista cases com filtro e paginação",
        security: bearerAuth,
        parameters: [
          ...PAGE_PARAMS,
          queryParam("status", "Filtra por status"),
          queryParam("ownerId", "Filtra por responsável"),
          queryParam("priority", "Filtra por prioridade"),
          queryParam("dossieId", "Filtra por dossiê"),
        ],
        responses: { 200: okResponse("Cases", pagedResponse(ref("Case"))), ...STANDARD_ERRORS },
      },
    },
    "/cases/{id}": {
      get: {
        tags: ["Case Management"],
        summary: "Detalhe do case (com notas e timeline)",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do case")],
        responses: { 200: okResponse("Case", ref("Case")), ...STANDARD_ERRORS },
      },
      patch: {
        tags: ["Case Management"],
        summary: "Atualiza owner/prioridade/tags/próxima ação do case",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do case")],
        requestBody: jsonBody({ type: "object" }),
        responses: { 204: { description: "Atualizado" }, ...STANDARD_ERRORS },
      },
    },
    "/cases/{id}/status": {
      patch: {
        tags: ["Case Management"],
        summary: "Transiciona o status do case (valida a máquina de estados)",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do case")],
        requestBody: jsonBody({
          type: "object",
          required: ["status"],
          properties: { status: { type: "string" } },
        }),
        responses: { 204: { description: "Status atualizado" }, ...STANDARD_ERRORS },
      },
    },
    "/cases/{id}/notes": {
      post: {
        tags: ["Case Management"],
        summary: "Adiciona uma nota ao case",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do case")],
        requestBody: jsonBody({
          type: "object",
          required: ["texto"],
          properties: { texto: { type: "string" } },
        }),
        responses: { 201: okResponse("Nota criada", { type: "object" }), ...STANDARD_ERRORS },
      },
    },

    // ---------------- Workflow ----------------
    "/workflows": {
      post: {
        tags: ["Workflow"],
        summary:
          "Cria uma definição de fluxo (estados/transições/condições) — inteiramente por dados",
        security: bearerAuth,
        requestBody: jsonBody(ref("WorkflowDefinitionInput")),
        responses: {
          201: okResponse("Definição criada", ref("WorkflowDefinition")),
          ...STANDARD_ERRORS,
        },
      },
      get: {
        tags: ["Workflow"],
        summary: "Lista definições de fluxo",
        security: bearerAuth,
        responses: {
          200: okResponse("Definições", { type: "array", items: ref("WorkflowDefinition") }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/workflows/{id}": {
      get: {
        tags: ["Workflow"],
        summary: "Consulta uma definição de fluxo",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da definição")],
        responses: { 200: okResponse("Definição", ref("WorkflowDefinition")), ...STANDARD_ERRORS },
      },
    },
    "/workflows/{id}/instances": {
      post: {
        tags: ["Workflow"],
        summary: "Inicia uma instância do fluxo no estado inicial",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da definição")],
        requestBody: jsonBody({
          type: "object",
          required: ["referenciaId"],
          properties: { referenciaId: { type: "string" } },
        }),
        responses: { 201: okResponse("Instância criada", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/workflow-instances/{id}": {
      get: {
        tags: ["Workflow"],
        summary: "Consulta uma instância de fluxo (estado atual + timeline)",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da instância")],
        responses: { 200: okResponse("Instância", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/workflow-instances/{id}/trigger": {
      post: {
        tags: ["Workflow"],
        summary: "Dispara uma transição por gatilho, avaliando a condição contra o contexto",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da instância")],
        requestBody: jsonBody({
          type: "object",
          required: ["gatilho"],
          properties: { gatilho: { type: "string" }, contexto: { type: "object" } },
        }),
        responses: {
          200: okResponse("Transição aplicada", { type: "object" }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Tenant ----------------
    "/tenants": {
      post: {
        tags: ["Tenant"],
        summary: "Cria um tenant",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["nome", "slug"],
          properties: { nome: { type: "string" }, slug: { type: "string" } },
        }),
        responses: {
          201: okResponse("Tenant criado", ref("Tenant")),
          ...STANDARD_ERRORS,
          409: errorResponse("Slug já em uso"),
        },
      },
      get: {
        tags: ["Tenant"],
        summary: "Lista tenants",
        security: bearerAuth,
        responses: {
          200: okResponse("Tenants", { type: "array", items: ref("Tenant") }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/tenants/{id}": {
      get: {
        tags: ["Tenant"],
        summary: "Consulta um tenant",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do tenant")],
        responses: { 200: okResponse("Tenant", ref("Tenant")), ...STANDARD_ERRORS },
      },
    },
    "/tenants/{id}/resources": {
      post: {
        tags: ["Tenant"],
        summary: "Registra a propriedade de um recurso para um tenant",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do tenant")],
        requestBody: jsonBody({
          type: "object",
          required: ["resourceType", "resourceId"],
          properties: { resourceType: { type: "string" }, resourceId: { type: "string" } },
        }),
        responses: {
          201: okResponse("Recurso registrado", { type: "object" }),
          ...STANDARD_ERRORS,
          409: errorResponse("Recurso já pertence a outro tenant"),
        },
      },
    },
    "/tenants/{id}/resources/{resourceType}/{resourceId}/access": {
      get: {
        tags: ["Tenant"],
        summary: "Verifica se o tenant pode acessar o recurso (fail-closed)",
        security: bearerAuth,
        parameters: [
          pathParam("id", "ID do tenant"),
          pathParam("resourceType", "Tipo do recurso"),
          pathParam("resourceId", "ID do recurso"),
        ],
        responses: {
          200: okResponse("Resultado", {
            type: "object",
            properties: { podeAcessar: { type: "boolean" } },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Rule Builder ----------------
    "/rules": {
      post: {
        tags: ["Rule Builder"],
        summary: "Cria uma regra configurável (peso, prioridade, condições, ação)",
        security: bearerAuth,
        requestBody: jsonBody(ref("RuleDefinitionInput")),
        responses: {
          201: okResponse("Regra criada (versão 1)", ref("RuleDefinition")),
          ...STANDARD_ERRORS,
        },
      },
      get: {
        tags: ["Rule Builder"],
        summary: "Lista regras, paginado, filtra por recurso/ativo",
        security: bearerAuth,
        parameters: [
          ...PAGE_PARAMS,
          queryParam("recurso", "Filtra por recurso"),
          queryParam("ativo", "Filtra por ativo", { type: "boolean" }),
        ],
        responses: {
          200: okResponse("Regras", pagedResponse(ref("RuleDefinition"))),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/rules/{id}": {
      get: {
        tags: ["Rule Builder"],
        summary: "Consulta uma regra com histórico completo de versões",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da regra")],
        responses: { 200: okResponse("Regra + histórico", { type: "object" }), ...STANDARD_ERRORS },
      },
      patch: {
        tags: ["Rule Builder"],
        summary: "Revisa uma regra — avança a versão, nunca sobrescreve a anterior",
        security: bearerAuth,
        parameters: [pathParam("id", "ID da regra")],
        requestBody: jsonBody(ref("RuleDefinitionInput")),
        responses: { 200: okResponse("Regra revisada", ref("RuleDefinition")), ...STANDARD_ERRORS },
      },
    },
    "/rules/evaluate": {
      post: {
        tags: ["Rule Builder"],
        summary: "Avalia as regras ativas de um recurso contra um contexto",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["recurso", "contexto"],
          properties: { recurso: { type: "string" }, contexto: { type: "object" } },
        }),
        responses: {
          200: okResponse("Resultado", {
            type: "object",
            properties: {
              regrasCasadas: { type: "array", items: { type: "object" } },
              pontuacaoTotal: { type: "number" },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Feature Flags ----------------
    "/feature-flags": {
      post: {
        tags: ["Feature Flags"],
        summary: "Cria uma feature flag",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["chave"],
          properties: {
            chave: { type: "string" },
            descricao: { type: "string", nullable: true },
            ativoPadrao: { type: "boolean" },
          },
        }),
        responses: {
          201: okResponse("Flag criada", ref("FeatureFlag")),
          ...STANDARD_ERRORS,
          409: errorResponse("Chave já existe"),
        },
      },
      get: {
        tags: ["Feature Flags"],
        summary: "Lista flags, paginado",
        security: bearerAuth,
        parameters: PAGE_PARAMS,
        responses: {
          200: okResponse("Flags", pagedResponse(ref("FeatureFlag"))),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/feature-flags/{chave}": {
      get: {
        tags: ["Feature Flags"],
        summary: "Consulta uma flag com todos os overrides",
        security: bearerAuth,
        parameters: [pathParam("chave", "Chave da flag")],
        responses: { 200: okResponse("Flag + overrides", { type: "object" }), ...STANDARD_ERRORS },
      },
      patch: {
        tags: ["Feature Flags"],
        summary: "Atualiza descrição/valor padrão da flag",
        security: bearerAuth,
        parameters: [pathParam("chave", "Chave da flag")],
        requestBody: jsonBody({
          type: "object",
          required: ["ativoPadrao"],
          properties: {
            descricao: { type: "string", nullable: true },
            ativoPadrao: { type: "boolean" },
          },
        }),
        responses: { 200: okResponse("Flag atualizada", ref("FeatureFlag")), ...STANDARD_ERRORS },
      },
    },
    "/feature-flags/{chave}/evaluate": {
      get: {
        tags: ["Feature Flags"],
        summary: "Resolve o valor da flag para um contexto (tenant/ambiente/usuário)",
        security: bearerAuth,
        parameters: [
          pathParam("chave", "Chave da flag"),
          queryParam("tenantId", "ID do tenant"),
          queryParam("ambiente", "Nome do ambiente"),
          queryParam("userId", "ID do usuário"),
        ],
        responses: {
          200: okResponse("Resolução", {
            type: "object",
            properties: {
              ativo: { type: "boolean" },
              origem: { type: "string", enum: ["USUARIO", "TENANT", "AMBIENTE", "PADRAO"] },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/feature-flags/{chave}/overrides": {
      put: {
        tags: ["Feature Flags"],
        summary: "Cria ou atualiza (upsert) o override de um escopo",
        security: bearerAuth,
        parameters: [pathParam("chave", "Chave da flag")],
        requestBody: jsonBody({
          type: "object",
          required: ["escopoTipo", "escopoValor", "ativo"],
          properties: {
            escopoTipo: { type: "string", enum: ["TENANT", "AMBIENTE", "USUARIO"] },
            escopoValor: { type: "string" },
            ativo: { type: "boolean" },
          },
        }),
        responses: { 200: okResponse("Override salvo", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/feature-flags/{chave}/overrides/{escopoTipo}/{escopoValor}": {
      delete: {
        tags: ["Feature Flags"],
        summary: "Remove um override — o escopo volta a herdar o mais amplo aplicável",
        security: bearerAuth,
        parameters: [
          pathParam("chave", "Chave da flag"),
          pathParam("escopoTipo", "Tipo do escopo"),
          pathParam("escopoValor", "Valor do escopo"),
        ],
        responses: { 204: { description: "Override removido" }, ...STANDARD_ERRORS },
      },
    },

    // ---------------- Scheduler ----------------
    "/scheduler/jobs": {
      post: {
        tags: ["Scheduler"],
        summary: "Agenda um job (nasce PENDENTE)",
        security: bearerAuth,
        requestBody: jsonBody({
          type: "object",
          required: ["nome", "tipo", "agendadoPara"],
          properties: {
            nome: { type: "string" },
            tipo: { type: "string" },
            payload: { type: "object" },
            agendadoPara: { type: "string", format: "date-time" },
            maxTentativas: { type: "integer" },
          },
        }),
        responses: { 201: okResponse("Job agendado", ref("ScheduledJob")), ...STANDARD_ERRORS },
      },
      get: {
        tags: ["Scheduler"],
        summary: "Lista jobs, paginado, filtra por status",
        security: bearerAuth,
        parameters: [
          ...PAGE_PARAMS,
          queryParam("status", "PENDENTE | EXECUTANDO | CONCLUIDO | MORTO"),
        ],
        responses: {
          200: okResponse("Jobs", pagedResponse(ref("ScheduledJob"))),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/scheduler/jobs/{id}": {
      get: {
        tags: ["Scheduler"],
        summary: "Consulta um job com histórico completo de execuções",
        security: bearerAuth,
        parameters: [pathParam("id", "ID do job")],
        responses: { 200: okResponse("Job + execuções", { type: "object" }), ...STANDARD_ERRORS },
      },
    },
    "/scheduler/jobs/run-due": {
      post: {
        tags: ["Scheduler"],
        summary: "Processa todos os jobs PENDENTE cuja agendadoPara já passou (o 'tick' do motor)",
        security: bearerAuth,
        requestBody: jsonBody(
          { type: "object", properties: { limit: { type: "integer" } } },
          false,
        ),
        responses: {
          200: okResponse("Resumo da execução", {
            type: "object",
            properties: {
              executados: { type: "integer" },
              concluidos: { type: "integer" },
              reagendados: { type: "integer" },
              mortos: { type: "integer" },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },

    // ---------------- Cache ----------------
    "/cache/entries/{namespace}": {
      put: {
        tags: ["Cache"],
        summary: "Grava um valor no cache (TTL resolvido pela política do namespace, ou override)",
        security: bearerAuth,
        parameters: [pathParam("namespace", "Namespace do cache")],
        requestBody: jsonBody({
          type: "object",
          required: ["valor"],
          properties: {
            identifier: { type: "string" },
            valor: {},
            ttlSegundos: { type: "integer" },
          },
        }),
        responses: {
          200: okResponse("Gravado", {
            type: "object",
            properties: { chave: { type: "string" }, ttlSegundos: { type: "integer" } },
          }),
          ...STANDARD_ERRORS,
        },
      },
      get: {
        tags: ["Cache"],
        summary: "Lê o cache (hit/miss + TTL restante)",
        security: bearerAuth,
        parameters: [
          pathParam("namespace", "Namespace do cache"),
          queryParam("identifier", "Identificador dentro do namespace"),
        ],
        responses: {
          200: okResponse("Resultado", {
            type: "object",
            properties: {
              hit: { type: "boolean" },
              valor: {},
              ttlRestanteSegundos: { type: "integer", nullable: true },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
      delete: {
        tags: ["Cache"],
        summary: "Invalida uma chave (com identifier) ou o namespace inteiro (sem identifier)",
        security: bearerAuth,
        parameters: [
          pathParam("namespace", "Namespace do cache"),
          queryParam("identifier", "Identificador dentro do namespace"),
        ],
        responses: {
          200: okResponse("Invalidado", {
            type: "object",
            properties: { chavesRemovidas: { type: "integer" } },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },
    "/cache/stats/{namespace}": {
      get: {
        tags: ["Cache"],
        summary: "Estatísticas de hit/miss acumuladas do namespace",
        security: bearerAuth,
        parameters: [pathParam("namespace", "Namespace do cache")],
        responses: {
          200: okResponse("Estatísticas", {
            type: "object",
            properties: {
              namespace: { type: "string" },
              hits: { type: "integer" },
              misses: { type: "integer" },
              hitRatio: { type: "number" },
            },
          }),
          ...STANDARD_ERRORS,
        },
      },
    },
  },
};
