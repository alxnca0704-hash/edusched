import { formatClock } from "../../constants/availability";
import { DAY_PATTERN_DAY_INDEXES } from "../../constants/dayPatterns";
import type {
  FreeWindow,
  InfeasibilityReason,
  PlacedSession,
  SchedulingInput,
  SchedulingSubject,
  SchedulingTimeSlot,
} from "./types";
import { blockedByDayFor, intervalsOverlap } from "./util";

function slotDurationOf(
  timeSlots: readonly SchedulingTimeSlot[],
): number {
  if (timeSlots.length === 0) {
    return 0;
  }
  const first = timeSlots[0];
  if (timeSlots.length > 1) {
    return timeSlots[1].startMinutes - first.startMinutes;
  }
  return first.endMinutes - first.startMinutes;
}

function meetingSlotCount(
  subject: SchedulingSubject,
  slotDuration: number,
): number {
  if (slotDuration <= 0) {
    return 0;
  }
  return Math.round(subject.durationMinutes / slotDuration);
}

function teacherSlotOccupied(
  timeSlots: readonly SchedulingTimeSlot[],
  blocked: ReadonlyMap<number, ReadonlySet<number>>,
  placedSessions: readonly PlacedSession[],
  teacherId: string,
  dayIndex: number,
  slotIndex: number,
): boolean {
  if (blocked.get(dayIndex)?.has(slotIndex)) {
    return true;
  }
  const slot = timeSlots[slotIndex];
  if (!slot) {
    return true;
  }
  return placedSessions.some(
    (placement) =>
      placement.teacherId === teacherId &&
      placement.dayIndex === dayIndex &&
      intervalsOverlap(
        placement.startMinutes,
        placement.endMinutes,
        slot.startMinutes,
        slot.endMinutes,
      ),
  );
}

export function freeWindowsForDay(
  input: SchedulingInput,
  subject: SchedulingSubject,
  placedSessions: readonly PlacedSession[],
  dayIndex: number,
): readonly FreeWindow[] {
  const timeSlots = input.timeSlots;
  const neededSlots = meetingSlotCount(subject, slotDurationOf(timeSlots));
  if (neededSlots <= 0 || timeSlots.length === 0) {
    return [];
  }
  const blocked = blockedByDayFor(subject.teacherId, input.availability);
  const windows: FreeWindow[] = [];
  let runStart = -1;
  for (let index = 0; index <= timeSlots.length; index++) {
    const free =
      index < timeSlots.length &&
      !teacherSlotOccupied(
        timeSlots,
        blocked,
        placedSessions,
        subject.teacherId,
        dayIndex,
        index,
      );
    if (free) {
      if (runStart < 0) {
        runStart = index;
      }
      continue;
    }
    if (runStart >= 0) {
      const runEnd = index - 1;
      if (runEnd - runStart + 1 >= neededSlots) {
        windows.push({
          start: timeSlots[runStart].startMinutes,
          end: timeSlots[runEnd].endMinutes,
        });
      }
      runStart = -1;
    }
  }
  return windows;
}

export function sharedStartTimes(
  day1Windows: readonly FreeWindow[],
  day2Windows: readonly FreeWindow[],
  timeSlots: readonly SchedulingTimeSlot[],
  durationMinutes: number,
): readonly number[] {
  const startsFor = (windows: readonly FreeWindow[]): Set<number> =>
    new Set(
      windows.flatMap((window) => {
        const starts: number[] = [];
        for (const slot of timeSlots) {
          if (
            slot.startMinutes >= window.start &&
            slot.endMinutes <= window.end &&
            slot.startMinutes + durationMinutes <= window.end
          ) {
            starts.push(slot.startMinutes);
          }
        }
        return starts;
      }),
    );
  const day1 = startsFor(day1Windows);
  const day2 = startsFor(day2Windows);
  return [...day1]
    .filter((start) => day2.has(start))
    .sort((a, b) => a - b);
}

function roomFreeAt(
  placedSessions: readonly PlacedSession[],
  roomId: string,
  dayIndex: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  return !placedSessions.some(
    (placement) =>
      placement.roomId === roomId &&
      placement.dayIndex === dayIndex &&
      intervalsOverlap(
        placement.startMinutes,
        placement.endMinutes,
        startMinutes,
        endMinutes,
      ),
  );
}

function dayShortName(input: SchedulingInput, dayIndex: number): string {
  return (
    input.days.find((day) => day.index === dayIndex)?.shortName ??
    `Day ${dayIndex + 1}`
  );
}

function windowsText(
  windows: readonly FreeWindow[],
  dayShort: string,
  durationMinutes: number,
): string {
  if (windows.length === 0) {
    return `${dayShort} has no ${durationMinutes}-min free window`;
  }
  const list = windows
    .map((window) => `${formatClock(window.start)}–${formatClock(window.end)}`)
    .join("; ");
  return `${dayShort} free ${list}`;
}

/**
 * Explains why a single subject's day-pair (MW/TTh) could not be placed.
 *
 * The teacher's free windows on each pattern day are computed from the
 * teacher's blocked slots (declared availability) minus any other placed
 * session of the same teacher on that day, restricted to the school-hours
 * grid and to windows long enough to fit the subject's duration.
 *
 * - No start time shared across both days → teacher-caused
 *   (`no-shared-teacher-window`).
 * - Shared start times exist but the subject's assigned room is occupied at
 *   every one → room-caused (`no-room-available`).
 * - Otherwise the subject fits in isolation and the failure comes from
 *   interactions between placements (`unknown`).
 */
export function explainInfeasibility(
  subject: SchedulingSubject,
  input: SchedulingInput,
  placedSessions: readonly PlacedSession[],
): InfeasibilityReason {
  const patternDays = DAY_PATTERN_DAY_INDEXES[subject.dayPattern] ?? [];
  const dayIndex1 = patternDays[0] ?? -1;
  const dayIndex2 = patternDays[1] ?? -1;

  const day1FreeWindows = freeWindowsForDay(
    input,
    subject,
    placedSessions,
    dayIndex1,
  );
  const day2FreeWindows = freeWindowsForDay(
    input,
    subject,
    placedSessions,
    dayIndex2,
  );
  const sharedStarts = sharedStartTimes(
    day1FreeWindows,
    day2FreeWindows,
    input.timeSlots,
    subject.durationMinutes,
  );

  const day1Short = dayShortName(input, dayIndex1);
  const day2Short = dayShortName(input, dayIndex2);

  if (sharedStarts.length === 0) {
    return {
      subjectName: subject.name,
      dayPattern: subject.dayPattern,
      durationMinutes: subject.durationMinutes,
      day1FreeWindows,
      day2FreeWindows,
      cause: "no-shared-teacher-window",
      message:
        `"${subject.name}" (${subject.durationMinutes} min, ${subject.dayPattern}) ` +
        `can't fit ${day1Short} & ${day2Short}: ` +
        `${windowsText(day1FreeWindows, day1Short, subject.durationMinutes)}; ` +
        `${windowsText(day2FreeWindows, day2Short, subject.durationMinutes)}. ` +
        `No matching ${subject.durationMinutes}-min start time exists on both days.`,
    };
  }

  const room = input.rooms.find((candidate) => candidate.id === subject.roomId);
  const roomName = room?.name ?? "the assigned room";

  const firstAvailable = sharedStarts.find(
    (start) =>
      dayIndex1 >= 0 &&
      dayIndex2 >= 0 &&
      roomFreeAt(
        placedSessions,
        subject.roomId,
        dayIndex1,
        start,
        start + subject.durationMinutes,
      ) &&
      roomFreeAt(
        placedSessions,
        subject.roomId,
        dayIndex2,
        start,
        start + subject.durationMinutes,
      ),
  );

  if (firstAvailable === undefined) {
    return {
      subjectName: subject.name,
      dayPattern: subject.dayPattern,
      durationMinutes: subject.durationMinutes,
      day1FreeWindows,
      day2FreeWindows,
      cause: "no-room-available",
      message:
        `"${subject.name}" (${subject.durationMinutes} min, ${subject.dayPattern}) ` +
        `is free at shared times on ${day1Short} & ${day2Short} ` +
        `(e.g. ${formatClock(sharedStarts[0])}), but ${roomName} is occupied at ` +
        `every shared start. Free up ${roomName} or assign a different room.`,
    };
  }

  return {
    subjectName: subject.name,
    dayPattern: subject.dayPattern,
    durationMinutes: subject.durationMinutes,
    day1FreeWindows,
    day2FreeWindows,
    cause: "unknown",
    message:
      `"${subject.name}" (${subject.durationMinutes} min, ${subject.dayPattern}) ` +
      `fits on its own at ${formatClock(firstAvailable)} on both days, but no ` +
      `full arrangement works with the other classes already placed. Try freeing ` +
      `the teacher or room at that time.`,
  };
}