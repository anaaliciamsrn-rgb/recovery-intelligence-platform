/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setup-env.cjs"],
  transform: {
    "^.+\\.ts$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript" },
        },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@rip/shared-types$": "<rootDir>/../../packages/shared-types/src/index.ts",
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  clearMocks: true,
  /**
   * Testes de integração compartilham um único Postgres/Redis reais entre
   * arquivos. Com workers paralelos, suítes concorrentes escrevem/apagam
   * `Pessoa`/`Dossie` no meio da janela de leitura de outra suíte — isso
   * quebra qualquer asserção baseada em contagem global (ex.: analytics,
   * ADR 0025), de forma não-determinística e sem relação com o código em
   * teste. `maxWorkers: 1` serializa a execução e elimina a classe inteira
   * desse problema (não é um ajuste pontual só para um teste específico).
   */
  maxWorkers: 1,
};
