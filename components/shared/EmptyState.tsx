"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-40 w-full flex-col items-center justify-center gap-4 rounded-xl bg-muted/30 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2">
        {Icon ? (
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </div>
        ) : (
          <Skeleton className="size-6 rounded-full" />
        )}
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center justify-center">{action}</div> : null}
    </div>
  );
}