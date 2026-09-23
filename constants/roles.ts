import type { Role } from "@/types/auth";

export const ROLES: Record<Role, Role> = {
  dean: "dean",
  teacher: "teacher",
};

export const ROLE_LABELS: Record<Role, string> = {
  dean: "Dean",
  teacher: "Teacher",
};