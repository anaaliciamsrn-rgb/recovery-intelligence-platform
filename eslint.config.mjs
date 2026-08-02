// @ts-check
import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import prettierConfig from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Cada camada casa tanto o shared kernel (raiz de src/) quanto qualquer
// bounded context em modules/<nome>/ (ver docs/architecture/decisions/0010).
// Isolamento módulo-a-módulo (ex.: identity não pode importar de um futuro
// scoring/) ainda não está configurado via capture groups — só faz sentido
// validar esse padrão quando existir um segundo módulo de verdade.
const apiLayers = [
  {
    type: "domain",
    mode: "full",
    pattern: ["apps/api/src/domain/**", "apps/api/src/modules/*/domain/**"],
  },
  {
    type: "application",
    mode: "full",
    pattern: ["apps/api/src/application/**", "apps/api/src/modules/*/application/**"],
  },
  {
    type: "infrastructure",
    mode: "full",
    pattern: ["apps/api/src/infrastructure/**", "apps/api/src/modules/*/infrastructure/**"],
  },
  {
    type: "presentation",
    mode: "full",
    pattern: ["apps/api/src/presentation/**", "apps/api/src/modules/*/presentation/**"],
  },
  {
    type: "container",
    mode: "full",
    pattern: ["apps/api/src/container/**", "apps/api/src/modules/*/container.ts"],
  },
  { type: "shared", mode: "full", pattern: "apps/api/src/shared/**" },
  { type: "main", mode: "full", pattern: "apps/api/src/main.ts" },
];

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.d.ts",
      "**/.husky/**",
      "pnpm-lock.yaml",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  // Enforcement da Clean Architecture em apps/api: a regra de dependência
  // (domain <- application <- infrastructure/presentation <- container) é
  // verificada automaticamente aqui, não só na revisão de código.
  {
    files: ["apps/api/src/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["apps/api/src/**/*.ts"],
      "boundaries/elements": apiLayers,
      // O plugin usa eslint-import-resolver-node por padrão, que não entende a
      // convenção "importar com .js, resolver para .ts" do NodeNext (ADR 0004).
      // Sem este resolver, todo import relativo do projeto vira "unknown" e a
      // regra de dependência abaixo nunca é violada — não porque está tudo
      // certo, mas porque o plugin não está vendo nada.
      "import/resolver": {
        typescript: { project: "apps/api/tsconfig.json" },
      },
    },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "domain", allow: ["domain"] },
            { from: "application", allow: ["domain", "application"] },
            {
              from: "infrastructure",
              allow: ["domain", "application", "shared", "infrastructure"],
            },
            { from: "presentation", allow: ["domain", "application", "shared", "presentation"] },
            { from: "shared", allow: ["shared"] },
            {
              from: "container",
              allow: [
                "domain",
                "application",
                "infrastructure",
                "presentation",
                "shared",
                "container",
              ],
            },
            { from: "main", allow: ["container", "shared"] },
          ],
        },
      ],
    },
  },
);
