export type Role = "dean" | "teacher";

export interface SessionClaimsMetadata {
  role?: Role;
}

export interface CurrentUser {
  userId: string;
  role: Role | null;
}