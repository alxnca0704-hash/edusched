"use client";

import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load subjects",
  message = "Something went wrong while loading. Try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-40 w-full flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 px-6 py-10 text-center",
        className,
      )}
    >
      <Skeleton className="size-6 rounded-full" />
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw />
          Retry
        </Button>
      ) : null}
    </div>
  );
}