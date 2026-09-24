import type { RoomType } from "@/types/rooms";

export interface ScheduleSession {
  _id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  roomId: string;
  roomName: string;
  roomType: RoomType;
  dayPattern: "MW" | "TTh";
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  createdAt: number;
  updatedAt: number;
}

export type InfeasibilityCause =
  | "no-shared-teacher-window"
  | "no-room-available"
  | "unknown";

export interface FreeWindow {
  start: number;
  end: number;
}

export interface InfeasiblePattern {
  dayPattern: "MW" | "TTh";
  day1FreeWindows: readonly FreeWindow[];
  day2FreeWindows: readonly FreeWindow[];
  cause: InfeasibilityCause;
  message: string;
}

export interface InfeasibleSubject {
  subjectName: string;
  durationMinutes: number;
  patterns: readonly InfeasiblePattern[];
}

export type GenerateScheduleResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: string;
      infeasibleSubjects?: readonly InfeasibleSubject[];
    };