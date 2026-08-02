# 0009 — Enforcement da arquitetura via ESLint (eslint-plugin-boundaries)

## Status

Aceito

## Contexto

A regra de dependência da Clean Architecture ([0001](0001-clean-architecture.md)) só vale alguma coisa se for realmente respeitada. Depender apenas de revisão de código manual para pegar "esse arquivo em `domain/` está importando de `infrastructure/`" não escala e falha silenciosamente sob pressão de prazo.

## Decisão

`eslint.config.mjs` (raiz) declara os elementos da arquitetura de `apps/api/src` (`domain`, `application`, `infrastructure`, `presentation`, `container`, `shared`, `main`) via `eslint-plugin-boundaries` e define explicitamente quem pode importar de quem:

| de \ para      | domain | application | infrastructure | presentation | shared | container |
| -------------- | ------ | ----------- | -------------- | ------------ | ------ | --------- |
| domain         | sim    | não         | não            | não          | não    | não       |
| application    | sim    | sim         | não            | não          | não    | não       |
| infrastructure | sim    | sim         | sim            | não          | sim    | não       |
| presentation   | sim    | sim         | não            | sim          | sim    | não       |
| container      | sim    | sim         | sim            | sim          | sim    | sim       |

Uma violação (ex.: um arquivo em `domain/` importando de `infrastructure/`) é erro de lint, não passa no CI (`pnpm lint` no job `lint` de `.github/workflows/ci.yml`).

### Pegadinha real: o resolver de imports

Por padrão, `eslint-plugin-boundaries` resolve imports com `eslint-import-resolver-node`, que faz resolução Node "crua" — ele não sabe que, sob `moduleResolution: NodeNext` (ver [ADR 0004](0004-esm-native-node-imports.md)), um import escrito como `"../infrastructure/logging/logger.js"` na verdade aponta para um arquivo `logger.ts` no disco. Sem ajuste, todo import relativo do projeto vira "unknown" para o plugin, e a regra `boundaries/element-types` **nunca dispara — não porque a arquitetura está correta, mas porque o plugin não está vendo os imports**. Isso foi detectado só ao testar deliberadamente uma violação (`domain` importando de `infrastructure`) e ver que o lint passava.

A correção: configurar `settings["import/resolver"].typescript` (via `eslint-import-resolver-typescript`) apontando para `apps/api/tsconfig.json`, para que a resolução entenda a convenção `.js -> .ts`. Qualquer alteração futura no ESLint deste projeto deve reexecutar o teste de fumaça abaixo — um lint "verde" não é prova de enforcement funcionando se o resolver estiver quebrado.

## Consequências

- A arquitetura é verificada em toda alteração, automaticamente — não depende de o revisor humano lembrar da regra.
- Novos diretórios dentro de `apps/api/src` que devam integrar a arquitetura precisam ser adicionados à lista `apiLayers` em `eslint.config.mjs`, ou ficam fora do enforcement.
- Teste de fumaça recomendado após qualquer mudança em `eslint.config.mjs`: adicionar temporariamente um import de `infrastructure` dentro de um arquivo em `domain/` e confirmar que `pnpm lint` falha com `boundaries/element-types` — depois revertê-lo. Um lint limpo, por si só, não comprova que a regra está ativa.
