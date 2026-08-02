import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi-document.js";

/**
 * Montado em `/api/v1` — `/docs` (Swagger UI) e `/openapi.json` (raw). Nunca
 * exige autenticação: é documentação pública da forma da API, não um dado
 * sensível. O CSP global (`securityHeadersMiddleware`, `script-src 'self'`
 * sem `unsafe-inline`) bloquearia o `<script>` inline que o próprio
 * `swagger-ui-express` injeta para inicializar a UI — por isso esta rota
 * recebe um CSP dedicado, mais permissivo só aqui, em vez de afrouxar o CSP
 * do resto da API.
 */
export function createOpenApiRouter(): Router {
  const router = Router();

  router.get("/openapi.json", (_req, res) => {
    res.status(200).json(openApiDocument);
  });

  router.use(
    "/docs",
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: { "script-src": ["'self'", "'unsafe-inline'"], "img-src": ["'self'", "data:"] },
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: "Recovery Intelligence Platform — API Docs",
    }),
  );

  return router;
}
