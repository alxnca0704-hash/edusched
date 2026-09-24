"use client";

import { useAction, useQuery } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "@/convex/_generated/api";
import type {
  GenerateScheduleResult,
  InfeasibleSubject,
  ScheduleSession,
} from "@/types/schedule";

export interface UseScheduleResult {
  sessions: ScheduleSession[];
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  isGenerating: boolean;
  generateError: string | null;
  infeasibleSubjects: InfeasibleSubject[] | null;
  generate: () => Promise<GenerateScheduleResult>;
}

function byTimeOfWeek(
  a: { dayIndex: number; startMinutes: number; subjectName: string },
  b: { dayIndex: number; startMinutes: number; subjectName: string },
): number {
  return (
    a.dayIndex - b.dayIndex ||
    a.startMinutes - b.startMinutes ||
    a.subjectName.localeCompare(b.subjectName)
  );
}

export function useSchedule(): UseScheduleResult {
  const listQuery = useQuery(api.schedule.listAll);
  const generateAction = useAction(api.schedule.generate);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [infeasibleSubjects, setInfeasibleSubjects] = useState<
    InfeasibleSubject[] | null
  >(null);

  const isLoading = listQuery === undefined;
  const error = listQuery?.ok === false ? listQuery.error : null;

  const sessions = listQuery?.ok
    ? [...listQuery.data].sort(byTimeOfWeek)
    : [];
  const isEmpty = !isLoading && !error && sessions.length === 0;

  const generate = useCallback(async (): Promise<GenerateScheduleResult> => {
    setIsGenerating(true);
    setGenerateError(null);
    setInfeasibleSubjects(null);
    try {
      const result = await generateAction();
      if (!result.ok) {
        setGenerateError(result.error);
        if (result.infeasibleSubjects && result.infeasibleSubjects.length > 0) {
          setInfeasibleSubjects([...result.infeasibleSubjects]);
        }
      }
      return result;
    } finally {
      setIsGenerating(false);
    }
  }, [generateAction]);

  return {
    sessions,
    isLoading,
    isEmpty,
    error,
    isGenerating,
    generateError,
    infeasibleSubjects,
    generate,
  };
}