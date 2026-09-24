"use client";

import { CalendarRange } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";

export default function TeacherSchedulePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">My Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Your assigned classes appear here once the Dean generates the
          schedule.
        </p>
      </div>
      <div className="mt-4">
        <EmptyState
          icon={CalendarRange}
          title="No schedule yet"
          description="The Dean hasn't generated a schedule yet. Check back after generation."
        />
      </div>
    </div>
  );
}