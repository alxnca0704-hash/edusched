import {
  AVAILABILITY_DAYS,
  AVAILABILITY_TIME_SLOTS,
} from "@/constants/availability";
import { Skeleton } from "@/components/ui/skeleton";

export function AvailabilityGridSkeleton() {
  return (
    <div className="overflow-x-auto">
      <div
        aria-hidden="true"
        className="grid min-w-[42rem] grid-cols-[3.25rem_repeat(6,minmax(5rem,1fr))] gap-1.5"
      >
        <Skeleton className="h-8" />
        {AVAILABILITY_DAYS.map((day) => (
          <Skeleton key={day.index} className="h-8" />
        ))}
        {AVAILABILITY_TIME_SLOTS.map((slot) =>
          AVAILABILITY_DAYS.map((day) => (
            <Skeleton
              key={`${day.index}-${slot.index}`}
              className="h-9 rounded-md"
            />
          )),
        )}
      </div>
    </div>
  );
}