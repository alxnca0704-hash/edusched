"use client";

import { Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";

import { ScheduleGenerationError } from "@/components/schedule/ScheduleGenerationError";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { ScheduleTableSkeleton } from "@/components/schedule/ScheduleTableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { useSchedule } from "@/hooks/useSchedule";

export function SchedulePage() {
  const {
    sessions,
    isLoading,
    isEmpty,
    error,
    isGenerating,
    generateError,
    infeasibleSubjects,
    generate,
  } = useSchedule();

  function handleLoadErrorRetry() {
    window.location.reload();
  }

  async function handleGenerate() {
    const result = await generate();
    if (result.ok) {
      toast.success(
        `Schedule generated — ${result.count} ${
          result.count === 1 ? "class" : "classes"
        } placed.`,
      );
    } else {
      toast.error("Couldn't generate a schedule");
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <ScheduleTableSkeleton />;
    }

    if (error) {
      return (
        <ErrorState
          title="Couldn't load the schedule"
          message={error}
          onRetry={handleLoadErrorRetry}
        />
      );
    }

    if (generateError) {
      if (infeasibleSubjects && infeasibleSubjects.length > 0) {
        return (
          <ScheduleGenerationError
            summary={generateError}
            reasons={infeasibleSubjects}
            onRetry={handleGenerate}
            isRetrying={isGenerating}
          />
        );
      }
      return (
        <ErrorState
          title="Couldn't generate a schedule"
          message={generateError}
          onRetry={handleGenerate}
        />
      );
    }

    if (isEmpty) {
      return (
        <EmptyState
          icon={WandSparkles}
          title="No schedule yet"
          description="Make sure rooms, subjects, and teacher availability are set up, then generate the timetable."
          action={
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : null}
              Generate Schedule
            </Button>
          }
        />
      );
    }

    return <ScheduleTable sessions={sessions} />;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Generate Schedule
        </h1>
        <p className="text-sm text-muted-foreground">
          Build a conflict-free timetable from rooms, subjects, and teacher
          availability.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {isEmpty
            ? "No timetable has been generated."
            : `${sessions.length} ${
                sessions.length === 1 ? "class" : "classes"
              } scheduled this week.`}
        </p>
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {isGenerating ? "Generating…" : "Generate Schedule"}
        </Button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl bg-white p-2 shadow-sm sm:p-4">
        {renderContent()}
      </div>
    </div>
  );
}