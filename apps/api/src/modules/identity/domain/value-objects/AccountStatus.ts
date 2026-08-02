export type AccountStatus = "ACTIVE" | "LOCKED" | "DISABLED";

export const AccountStatus = {
  ACTIVE: "ACTIVE",
  LOCKED: "LOCKED",
  DISABLED: "DISABLED",
} as const satisfies Record<string, AccountStatus>;
