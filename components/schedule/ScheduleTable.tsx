"use client";

import { useMemo } from "react";

import {
  AVAILABILITY_DAYS,
  formatClock,
} from "@/constants/availability";
import { DAY_PATTERNS } from "@/constants/dayPatterns";
import { ROOM_TYPE_LABELS } from "@/constants/rooms";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleSession } from "@/types/schedule";

export interface ScheduleTableProps {
  sessions: readonly ScheduleSession[];
  className?: string;
}

interface SubjectGroup {
  subjectId: string;
  subjectName: string;
  teacherName: string;
  roomName: string;
  roomType: ScheduleSession["roomType"];
  sessions: ScheduleSession[];
}

function scheduleDayName(dayIndex: number): string {
  return AVAILABILITY_DAYS[dayIndex]?.name ?? `Day ${dayIndex + 1}`;
}

function scheduleTimeLabel(startMinutes: number, endMinutes: number): string {
  return `${formatClock(startMinutes)} – ${formatClock(endMinutes)}`;
}

function isCleanPair(group: SubjectGroup): boolean {
  if (group.sessions.length !== 2) {
    return false;
  }
  const [a, b] = group.sessions;
  return (
    a.startMinutes === b.startMinutes &&
    a.endMinutes === b.endMinutes &&
    a.roomId === b.roomId
  );
}

export function ScheduleTable({ sessions, className }: ScheduleTableProps) {
  const groups = useMemo(() => {
    const bySubject = new Map<string, SubjectGroup>();
    for (const session of sessions) {
      let group = bySubject.get(session.subjectId);
      if (!group) {
        group = {
          subjectId: session.subjectId,
          subjectName: session.subjectName,
          teacherName: session.teacherName,
          roomName: session.roomName,
          roomType: session.roomType,
          sessions: [],
        };
        bySubject.set(session.subjectId, group);
      }
      group.sessions.push(session);
    }
    return [...bySubject.values()].sort(
      (a, b) =>
        a.sessions[0].startMinutes - b.sessions[0].startMinutes ||
        a.subjectName.localeCompare(b.subjectName),
    );
  }, [sessions]);

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-48">Subject</TableHead>
          <TableHead>Teacher</TableHead>
          <TableHead>Room</TableHead>
          <TableHead>Schedule Pattern</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.flatMap((group) => {
          if (isCleanPair(group)) {
            const pattern = group.sessions[0].dayPattern;
            const [first] = group.sessions;
            return [
              <TableRow key={group.subjectId}>
                <TableCell className="font-medium">
                  {group.subjectName}
                </TableCell>
                <TableCell>{group.teacherName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{group.roomName}</span>
                    <Badge variant="secondary">
                      {ROOM_TYPE_LABELS[group.roomType]}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {pattern ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{pattern}</Badge>
                      <span className="text-muted-foreground">
                        {DAY_PATTERNS[pattern].join(" & ")}
                      </span>
                    </div>
                  ) : (
                    group.sessions.map((session) => scheduleDayName(session.dayIndex)).join(" & ")
                  )}
                </TableCell>
                <TableCell>
                  {scheduleTimeLabel(first.startMinutes, first.endMinutes)}
                </TableCell>
              </TableRow>,
            ];
          }

          return group.sessions.map((session) => (
            <TableRow key={session._id}>
              <TableCell className="font-medium">
                {group.subjectName}
              </TableCell>
              <TableCell>{group.teacherName}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{group.roomName}</span>
                  <Badge variant="secondary">
                    {ROOM_TYPE_LABELS[group.roomType]}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{scheduleDayName(session.dayIndex)}</TableCell>
              <TableCell>
                {scheduleTimeLabel(session.startMinutes, session.endMinutes)}
              </TableCell>
            </TableRow>
          ));
        })}
      </TableBody>
    </Table>
  );
}