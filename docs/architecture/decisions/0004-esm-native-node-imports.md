# 0004 — ESM + resolução de módulos NodeNext

## Status

Aceito

## Contexto

Node.js já trata ESM como o padrão de facto para projetos novos, e o `moduleResolution: "NodeNext"` do TypeScript espelha exatamente as regras reais de resolução do Node (incluindo a exigência de extensão explícita `.js` em imports relativos). Escrever em CommonJS em 2026 é optar por um modelo legado sem ganho compensatório para este projeto.

## Decisão

`apps/api` usa `"type": "module"` + `module`/`moduleResolution: "NodeNext"` no `tsconfig`. Imports relativos usam extensão `.js` (ex.: `import { env } from "../shared/config/env.js"`), mesmo apontando para um arquivo `.ts` — é assim que o Node vai resolver o `.js` gerado pelo `tsc`.

`packages/shared-types` não precisa de build: como só exporta `interface`/`type` (nenhum valor em runtime) e é sempre importado com `import type`, o import é apagado na compilação — não existe, em nenhum ambiente, uma tentativa real de `require`/`import` do pacote em runtime. Por isso seu `package.json` aponta `exports` direto para `src/index.ts`: o TypeScript lê o `.ts` para checagem de tipo, e não há nada para resolver em runtime.

## Consequências

- `apps/web` usa `moduleResolution: "Bundler"` (Vite/esbuild), que **não** segue essa regra de extensão — lá os imports relativos ficam sem extensão (`./App`, não `./App.js`). É uma inconsistência intencional entre os dois apps, cada um seguindo a convenção do seu próprio ambiente de execução.
- Se `packages/shared-types` algum dia exportar valores em runtime (ex.: um schema Zod compartilhado), essa decisão precisa ser revisitada: nesse ponto o pacote passa a precisar de um build (`tsc`) próprio antes de ser consumido por `apps/api` em produção.
