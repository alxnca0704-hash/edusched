import type { ReactNode } from "react";

import { TeacherSidebar } from "@/components/TeacherSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ROLES } from "@/constants/roles";
import { requireRole } from "@/hooks/useAuth";

export default async function TeacherLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(ROLES.teacher);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <div className="relative flex w-full flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
          <SidebarTrigger className="-ml-2" />
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  );
}