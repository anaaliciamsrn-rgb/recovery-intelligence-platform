import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppMetadata } from "@rip/shared-types";
import type { IAppMetadataProvider } from "../../application/ports/IAppMetadataProvider.js";
import type { Env } from "../../shared/config/env.js";

interface PackageJsonShape {
  version?: string;
}

/**
 * Lê a versão diretamente do package.json de apps/api — mesma fonte de
 * verdade usada para versionar o pacote, nunca uma segunda constante que
 * pode dessincronizar. Resolvido via `import.meta.url` para funcionar tanto
 * em dev (tsx roda src/) quanto em produção (node roda dist/), já que os
 * dois têm a mesma profundidade de pastas a partir da raiz do app.
 */
function readPackageVersion(): string {
  const packageJsonPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../package.json",
  );

  const raw = readFileSync(packageJsonPath, "utf-8");
  const parsed = JSON.parse(raw) as PackageJsonShape;

  return parsed.version ?? "unknown";
}

export class AppMetadataProvider implements IAppMetadataProvider {
  private readonly metadata: AppMetadata;

  constructor(env: Env) {
    this.metadata = {
      version: readPackageVersion(),
      buildTimestamp: env.BUILD_TIMESTAMP,
      nodeVersion: process.version,
      environment: env.NODE_ENV,
    };
  }

  getMetadata(): AppMetadata {
    return this.metadata;
  }
}
