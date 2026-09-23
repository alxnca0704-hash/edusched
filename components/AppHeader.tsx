"use client";

import { Show, UserButton } from "@clerk/nextjs";

import { useUserSync } from "@/hooks/useUserSync";

export function AppHeader() {
  useUserSync();

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[var(--app-header-height)] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="text-sm font-semibold tracking-wide text-gray-900">
          NDKC EduSched
        </span>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}