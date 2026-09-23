"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, DoorOpen, LayoutDashboard } from "lucide-react";

import { APP_ROUTES } from "@/constants/routes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const DEAN_NAV = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: APP_ROUTES.dean,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Manage",
    items: [
      {
        title: "Manage Rooms",
        href: APP_ROUTES.deanRooms,
        icon: DoorOpen,
      },
      {
        title: "Manage Subjects",
        href: APP_ROUTES.deanSubjects,
        icon: BookOpen,
      },
    ],
  },
] as const;

export function DeanSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      style={
        {
          top: "var(--app-header-height)",
          bottom: "0px",
          height: "auto",
        } as CSSProperties
      }
    >
      <SidebarContent>
        {DEAN_NAV.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={isActive}
                        tooltip={item.title}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}