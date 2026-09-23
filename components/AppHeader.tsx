"use client";

import { Show, UserButton } from "@clerk/nextjs";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-sm font-semibold tracking-wide text-gray-900">
          NDKC EdSched
        </span>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}