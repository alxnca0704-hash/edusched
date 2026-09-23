"use client";

import { useUser } from "@clerk/nextjs";
import { Alert, Card, Skeleton, Typography } from "antd";

import { useDeanDashboard } from "@/hooks/useDeanDashboard";

export function DeanDashboard() {
  const { data, isLoading, error } = useDeanDashboard();
  const { isLoaded, user } = useUser();

  const loading = isLoading || !isLoaded;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      {error ? (
        <Alert type="error" showIcon message={error} />
      ) : (
        <Card className="shadow-sm">
          {loading ? (
            <Skeleton active />
          ) : (
            <>
              <Typography.Title level={3}>{data.title}</Typography.Title>
              <Typography.Paragraph className="text-gray-500">
                Welcome back,{" "}
                {user?.firstName ??
                  user?.primaryEmailAddress?.emailAddress ??
                  "there"}
                .
              </Typography.Paragraph>
            </>
          )}
        </Card>
      )}
    </div>
  );
}