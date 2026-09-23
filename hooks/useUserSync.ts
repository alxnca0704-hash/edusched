"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";

import { api } from "@/convex/_generated/api";

export function useUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const upsertUser = useMutation(api.users.upsertUser);
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      return;
    }
    if (syncedUserId.current === user.id) {
      return;
    }

    syncedUserId.current = user.id;
    void upsertUser().catch((error) => {
      console.error("Failed to sync user to Convex", error);
    });
  }, [isLoaded, isSignedIn, user, upsertUser]);
}