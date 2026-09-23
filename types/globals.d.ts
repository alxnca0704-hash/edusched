import type { SessionClaimsMetadata } from "@/types/auth";

export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: SessionClaimsMetadata;
  }
}