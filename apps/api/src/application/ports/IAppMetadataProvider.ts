import type { AppMetadata } from "@rip/shared-types";

/**
 * Metadados do artefato/ambiente (versão, build, Node, environment).
 * Estático durante o tempo de vida do processo — por isso `getMetadata` é
 * síncrono, sem necessidade de `Promise`.
 */
export interface IAppMetadataProvider {
  getMetadata(): AppMetadata;
}
