export type DirecaoFator = "AUMENTA_RISCO" | "REDUZ_RISCO";

export const DirecaoFator = {
  AUMENTA_RISCO: "AUMENTA_RISCO",
  REDUZ_RISCO: "REDUZ_RISCO",
} as const satisfies Record<string, DirecaoFator>;
