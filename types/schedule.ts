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

export interface InfeasibleSubject {
  subjectName: string;
  dayPattern: "MW" | "TTh";
  durationMinutes: number;
  day1FreeWindows: readonly FreeWindow[];
  day2FreeWindows: readonly FreeWindow[];
  cause: InfeasibilityCause;
  message: string;
}

export type GenerateScheduleResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: string;
      infeasibleSubjects?: readonly InfeasibleSubject[];
    };