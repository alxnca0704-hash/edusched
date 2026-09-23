"use client";

export interface DeanDashboardData {
  title: string;
}

export function useDeanDashboard(): {
  data: DeanDashboardData;
  isLoading: boolean;
  error: string | null;
} {
  return {
    data: { title: "Dean Dashboard" },
    isLoading: false,
    error: null,
  };
}