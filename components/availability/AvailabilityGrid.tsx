"use client";

import { Fragment } from "react";

import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_TIME_SLOTS,
  availabilitySlotKey,
} from "@/constants/availability";
import { cn } from "@/lib/utils";

export interface AvailabilityGridProps {
  blocked: ReadonlySet<string>;
  onToggle: (dayIndex: number, timeSlotIndex: number) => void;
  disabled?: boolean;
}

export function AvailabilityGrid({
  blocked,
  onToggle,
  disabled = false,
}: AvailabilityGridProps) {
  return (
    <TooltipProvider delay={0}>
      <div className="overflow-x-auto">
        <div
          role="grid"
          aria-label="Weekly availability"
          className="grid min-w-[42rem] grid-cols-[3.25rem_repeat(6,minmax(5rem,1fr))] gap-1.5"
        >
          <div aria-hidden="true" className="h-8" />
          {AVAILABILITY_DAYS.map((day) => (
            <div
              key={day.index}
              className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
            >
              {day.shortName}
            </div>
          ))}

          {AVAILABILITY_TIME_SLOTS.map((slot) => (
            <Fragment key={slot.index}>
              <div
                role="rowheader"
                className="flex items-center justify-end pr-1 text-xs text-muted-foreground"
              >
                {slot.label}
              </div>
              {AVAILABILITY_DAYS.map((day) => {
                const key = availabilitySlotKey(day.index, slot.index);
                const isBlocked = blocked.has(key);

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger
                      render={
                        <Toggle
                          pressed={isBlocked}
                          onPressedChange={() =>
                            onToggle(day.index, slot.index)
                          }
                          aria-label={`${day.name} ${slot.rangeLabel}${
                            isBlocked
                              ? ", unavailable"
                              : ", available"
                          }`}
                          variant="outline"
                          disabled={disabled}
                          className={cn(
                            "h-9 w-full rounded-md",
                            isBlocked
                              ? "border-transparent bg-accent-primary text-accent-primary-foreground hover:bg-accent-primary/90 aria-pressed:bg-accent-primary"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        />
                      }
                    />
                    <TooltipContent>
                      {day.name} {slot.rangeLabel}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}