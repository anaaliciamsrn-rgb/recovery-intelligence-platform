export type DossieSubjectType = "PESSOA" | "EMPRESA";

export const DossieSubjectType = {
  PESSOA: "PESSOA",
  EMPRESA: "EMPRESA",
} as const satisfies Record<string, DossieSubjectType>;
