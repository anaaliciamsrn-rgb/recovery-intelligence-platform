export type MatchDecision = "MATCH" | "POSSIBLE_MATCH" | "NO_MATCH";

export const MatchDecision = {
  MATCH: "MATCH",
  POSSIBLE_MATCH: "POSSIBLE_MATCH",
  NO_MATCH: "NO_MATCH",
} as const satisfies Record<string, MatchDecision>;
