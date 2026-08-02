export interface VersionTimelineEntry {
  versao: number;
  timestamp: Date;
  usuarioId: string | null;
  hash: string;
  /** Vazio para a versão 1 (linha de base) — nada para comparar antes dela. */
  resumoMudancas: string[];
}
