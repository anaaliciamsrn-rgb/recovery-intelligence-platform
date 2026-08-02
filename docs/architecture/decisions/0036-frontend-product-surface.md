# 0036 — Frontend: fundação e superfície de produto

## Status

Aceito e implementado — primeira e única leva de telas de negócio do frontend nesta fase

## Contexto

Até esta fase, `apps/web` era só o shell mínimo do scaffold inicial (ADR 0001), sem nenhuma tela de negócio — toda a plataforma só existia como API. O pedido desta fase de polimento incluía explicitamente um conjunto fechado de telas (dashboard executivo, operacional, dossiê, grafo de relacionamento, relatório executivo, landing page) — não "criar um frontend genérico", mas estas telas específicas, ligadas aos endpoints já existentes.

## Stack

- **React Router v6** (`react-router-dom`) — roteamento client-side padrão, sem SSR (a API já serve JSON puro; SSR não traria benefício e adicionaria complexidade de build).
- **Recharts** — gráficos do dashboard executivo (pizza de distribuição de risco, linha de evolução temporal, barras de canais). Isolado num chunk próprio (`vendor-charts`, ver `vite.config.ts`) porque é a dependência mais pesada do bundle (~110 KB gzipped) e muda com pouca frequência — separar do código da aplicação melhora o cache do navegador entre deploys.
- **Tailwind CSS v4** (`@import "tailwindcss"`, config CSS-first, sem `tailwind.config.js`) + **um sistema de design tokens próprio via CSS custom properties** (`styles/global.css`) — nenhum componente usa uma cor Tailwind fixa (`bg-indigo-600`), sempre `var(--color-primary)` etc. É o mecanismo que viabiliza o priority item "White Label completo": `ThemeContext.setBrand()` reescreve as custom properties em runtime, sem rebuild.

## Autenticação no frontend

Token de acesso vive **só em memória** (variável de módulo em `lib/api-client.ts`), nunca em `localStorage` — reduz a superfície de um roubo via XSS a "só durante a aba aberta". O refresh token continua exclusivamente no cookie `httpOnly` já implementado pelo backend (`identity`, ADR 0007/0008) — o frontend nunca o lê nem o manipula diretamente.

**Endpoint novo, aditivo, em módulo existente**: `POST /auth/refresh` deliberadamente nunca devolveu o perfil do usuário (endpoint mínimo por design). Sem isso, não havia como reconstruir "quem está logado" depois de um F5 sem decodificar o JWT no cliente (rejeitado — mais frágil, duplica lógica que já existe no backend). Adicionado `GET /auth/me` ao módulo `identity` (`GetCurrentUserUseCase`, novo; `AuthController.getCurrentUser`, novo handler; nenhum endpoint existente alterado) — é uma extensão de um módulo já aprovado, não um módulo novo.

Mesmo raciocínio para o grafo de relacionamento: `ParticipacaoSocietaria` só guarda `pessoaId`/`empresaId` opacos; não existia endpoint para resolver um ID para nome. Adicionados `GET /pessoas/id/:id` e `GET /empresas/id/:id` ao módulo `party` já existente, reaproveitando `findById` que já existia no repositório mas nunca fora exposto via HTTP.

## Grafo de relacionamento: layout radial determinístico, não física de partículas

`RelationshipGraphPage` foi desenhada sem `d3-force` ou qualquer simulação de física. O dado real (as participações societárias diretas de uma única Pessoa/Empresa) é sempre um fan-out pequeno e limitado — uma simulação de física adicionaria _jitter_ visual e uma dependência pesada sem necessidade real. O layout é só trigonometria: `N` nós distribuídos em círculo ao redor do nó central, ângulo `2π·i/N`. Mais simples, determinístico (o mesmo dado sempre produz o mesmo desenho, importante para captura de tela/relatório), e alinhado à instrução do usuário de preferir um sistema refinado a um com mais peças móveis.

## Relatório executivo: impressão nativa, não geração de PDF no servidor

`ExecutiveReportPage` é uma página dedicada (fora do `AppShell`, sem sidebar/topbar — ver `App.tsx`), estilizada para impressão via `@media print` (`global.css`, classe `.no-print` esconde a navegação). O botão "Exportar PDF" chama só `window.print()` — o próprio motor de impressão do navegador já pagina HTML/CSS corretamente. Rejeitada deliberadamente uma dependência de geração de PDF no servidor (ex. Puppeteer/PDFKit): adicionaria uma dependência pesada e um novo processo (renderização headless de Chromium) só para reproduzir o que o navegador do usuário já faz de graça.

## Erros corrigidos durante a implementação

- `exactOptionalPropertyTypes: true` (já ligado em `tsconfig.base.json` para toda a plataforma) rejeitava `fetch(url, { body: undefined })` e `{ query: undefined }` em `api-client.ts` — literais de objeto com uma chave presente cujo valor é `undefined` não satisfazem um tipo que só declara `X | null` (não `X | null | undefined`) para essa propriedade. Corrigido construindo o `RequestInit`/opções condicionalmente (só define a chave quando o valor existe), em vez de afrouxar o `tsconfig`.
- `color-mix(in srgb, var(--color-x) N%, transparent)` para tons com transparência — a primeira tentativa concatenava `var(--color-primary) + "1a"` como string (padrão válido para hex literal, inválido para uma `var()`), que o navegador simplesmente ignora silenciosamente (sem erro de build, só a cor errada em runtime). `Badge.tsx`/`KpiCard.tsx` corrigidos para `color-mix()`.

## Consequências

- `apps/web/package.json` ganha `react-router-dom`, `recharts` (deps) e `tailwindcss`, `@tailwindcss/vite` (devDeps) — primeiras dependências de UI além do shell React puro do scaffold.
- Nenhuma tela de negócio autentica de fato nesta fase sem um Postgres/Redis reais rodando (ambiente de desenvolvimento local) — validado via dev server que a landing page, o formulário de login e o guard de rota protegida (`ProtectedRoute`) renderizam e redirecionam corretamente mesmo sem backend ativo, sem erros de console.
