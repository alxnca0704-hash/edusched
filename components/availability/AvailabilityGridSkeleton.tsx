import { Skeleton } from "@/components/ui/skeleton";

export function AvailabilityGridSkeleton() {
  return (
    <div className="overflow-x-auto">
      <div
        aria-hidden="true"
        className="grid min-w-[42rem] grid-cols-[3.25rem_repeat(6,minmax(5rem,1fr))] gap-1.5"
      >
        <Skeleton className="h-8" />
        {Array.from({ length: 6 }, (_, day) => (
          <Skeleton key={day} className="h-8" />
        ))}
        {Array.from({ length: 60 }, (_, cell) => (
          <Skeleton key={cell} className="h-9 rounded-md" />
        ))}
      </div>
    </div>
  );
}