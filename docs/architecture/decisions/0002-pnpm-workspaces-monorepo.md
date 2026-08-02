# 0002 — Monorepo com pnpm workspaces

## Status

Aceito

## Contexto

O backend (`apps/api`) e o frontend (`apps/web`) precisam compartilhar contratos de tipos TypeScript (ex.: formato de erro HTTP, formato de resposta do health-check) sem duplicação. Precisamos também de um único ponto de entrada para lint/test/build de todo o repositório.

## Decisão

Monorepo único com `apps/*` (aplicações deployáveis) e `packages/*` (código compartilhado, sem deploy próprio), gerenciado via **pnpm workspaces**.

Motivos para pnpm em vez de npm/yarn workspaces:

- `node_modules` estrito por padrão — um pacote só acessa o que declarou como dependência (sem _phantom dependencies_), o que evita bugs de produção causados por dependências transitivas usadas por acidente.
- Instalação e cache de pacotes mais rápidos via hard links, importante à medida que o monorepo cresce.
- Padrão amplamente adotado em empresas de tecnologia de porte similar ao que este projeto usa como referência.

## Consequências

- `packages/shared-types` é consumido diretamente como TypeScript fonte (sem build) pelos dois apps, via `workspace:*` — ver [0004](0004-esm-native-node-imports.md) sobre como isso resolve em runtime.
- Contribuidores precisam ter o pnpm instalado (via Corepack ou `npm i -g pnpm`); documentado no README raiz.
- Scripts na raiz (`pnpm -r lint`, `pnpm -r test`, etc.) operam em todos os workspaces de uma vez, mantendo um único comando de entrada para CI.
