export type SchedulingRoomType = "lecture" | "lab";

export type SchedulingDayPattern = "MW" | "TTh";

export interface SchedulingDay {
  index: number;
  name: string;
  shortName: string;
}

export interface SchedulingTimeSlot {
  index: number;
  startMinutes: number;
  endMinutes: number;
}

export interface SchedulingRoom {
  id: string;
  name: string;
  type: SchedulingRoomType;
}

export interface SchedulingSubject {
  id: string;
  name: string;
  teacherId: string;
  roomId: string;
  requiredRoomType: SchedulingRoomType;
  durationMinutes: number;
}

export interface BlockedPattern {
  dayPattern: SchedulingDayPattern;
  slotIndexes: readonly number[];
}

export interface SchedulingAvailability {
  teacherId: string;
  blockedByPattern: readonly BlockedPattern[];
}

export interface SchedulingInput {
  days: readonly SchedulingDay[];
  timeSlots: readonly SchedulingTimeSlot[];
  rooms: readonly SchedulingRoom[];
  subjects: readonly SchedulingSubject[];
  availability: readonly SchedulingAvailability[];
}

export interface PlacedSession {
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayPattern: SchedulingDayPattern;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
}

export interface FreeWindow {
  start: number;
  end: number;
}

export type InfeasibilityCause =
  | "no-shared-teacher-window"
  | "no-room-available"
  | "unknown";

export interface PatternInfeasibility {
  dayPattern: SchedulingDayPattern;
  day1FreeWindows: readonly FreeWindow[];
  day2FreeWindows: readonly FreeWindow[];
  cause: InfeasibilityCause;
  message: string;
}

export interface InfeasibilityReason {
  subjectName: string;
  durationMinutes: number;
  patterns: readonly PatternInfeasibility[];
}

export type CspInfeasibleReason =
  | { code: "no-subjects"; message: string }
  | { code: "no-rooms"; message: string }
  | { code: "invalid-duration"; message: string }
  | { code: "no-matching-room"; message: string };

export type CspResult =
  | { ok: true; solution: PlacedSession[] }
  | { ok: false; reason: CspInfeasibleReason }
  | { ok: false; reasons: readonly InfeasibilityReason[] };

export interface GaOptions {
  populationSize?: number;
  maxIterations?: number;
}