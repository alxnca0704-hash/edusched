"use client";

import { Loader2, RotateCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatClock } from "@/constants/availability";
import { DAY_PATTERNS } from "@/constants/dayPatterns";
import { cn } from "@/lib/utils";
import type {
  InfeasibilityCause,
  InfeasibleSubject,
} from "@/types/schedule";

const CAUSE_LABELS: Record<InfeasibilityCause, string> = {
  "no-shared-teacher-window": "Teacher availability",
  "no-room-available": "Room availability",
  unknown: "Placement conflict",
};

export interface ScheduleGenerationErrorProps {
  title?: string;
  summary: string;
  reasons: readonly InfeasibleSubject[];
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

function FreeWindowsBlock({
  dayLabel,
  windows,
  durationMinutes,
}: {
  dayLabel: string;
  windows: readonly { start: number; end: number }[];
  durationMinutes: number;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2 text-left">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {dayLabel} free
      </p>
      {windows.length > 0 ? (
        <p className="mt-1 text-sm">
          {windows
            .map((window) => `${formatClock(window.start)}–${formatClock(window.end)}`)
            .join(", ")}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          No {durationMinutes}-min window
        </p>
      )}
    </div>
  );
}

function InfeasibleSubjectDetails({ reason }: { reason: InfeasibleSubject }) {
  const days = DAY_PATTERNS[reason.dayPattern];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{reason.message}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FreeWindowsBlock
          dayLabel={days[0] ?? "Day 1"}
          windows={reason.day1FreeWindows}
          durationMinutes={reason.durationMinutes}
        />
        <FreeWindowsBlock
          dayLabel={days[1] ?? "Day 2"}
          windows={reason.day2FreeWindows}
          durationMinutes={reason.durationMinutes}
        />
      </div>
    </div>
  );
}

export function ScheduleGenerationError({
  title = "Couldn't generate a schedule",
  summary,
  reasons,
  onRetry,
  isRetrying = false,
  className,
}: ScheduleGenerationErrorProps) {
  const firstValue = reasons.length > 0 ? `${reasons[0].subjectName}-0` : "";

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-4 rounded-xl bg-muted/30 px-6 py-10 text-center",
        className,
      )}
    >
      <Skeleton className="size-6 rounded-full" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{summary}</p>
      </div>

      {reasons.length > 0 ? (
        <Accordion multiple defaultValue={[firstValue]} className="w-full max-w-3xl">
          {reasons.map((reason, index) => {
            const value = `${reason.subjectName}-${index}`;
            return (
              <AccordionItem key={value} value={value}>
                <AccordionTrigger className="items-center gap-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate">{reason.subjectName}</span>
                    <Badge variant="secondary">{reason.dayPattern}</Badge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {reason.durationMinutes} min
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {CAUSE_LABELS[reason.cause]}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <InfeasibleSubjectDetails reason={reason} />
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : null}

      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <Loader2 className="size-4 animate-spin" /> : <RotateCw />}
          Retry
        </Button>
      ) : null}
    </div>
  );
}