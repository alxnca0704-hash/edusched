"use client";

export interface TeacherDashboardData {
  title: string;
}

export function useTeacherDashboard(): {
  data: TeacherDashboardData;
  isLoading: boolean;
  error: string | null;
} {
  return {
    data: { title: "Teacher Dashboard" },
    isLoading: false,
    error: null,
  };
}