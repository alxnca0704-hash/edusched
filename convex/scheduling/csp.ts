import { DAY_PATTERN_DAY_INDEXES } from "../../constants/dayPatterns";
import type {
  CspInfeasibleReason,
  CspResult,
  InfeasibilityReason,
  PlacedSession,
  SchedulingInput,
  SchedulingSubject,
} from "./types";
import { blockedByDayFor, intervalsOverlap, type Interval } from "./util";
import { explainInfeasibility } from "./cspDiagnostics";

export interface TimeOption {
  startMinutes: number;
  endMinutes: number;
}

export interface SubjectUnit {
  unitKey: string;
  subject: SchedulingSubject;
  days: readonly number[];
  candidates: readonly TimeOption[];
}

const MAX_ATTEMPTS = 200_000;

interface SubjectPlacement {
  unit: SubjectUnit;
  option: TimeOption;
}

class OccupancyTracker {
  private readonly byTeacher = new Map<string, Map<number, Interval[]>>();
  private readonly byRoom = new Map<string, Map<number, Interval[]>>();

  private entriesFor(
    map: Map<string, Map<number, Interval[]>>,
    key: string,
    dayIndex: number,
  ): Interval[] {
    let byDay = map.get(key);
    if (!byDay) {
      byDay = new Map();
      map.set(key, byDay);
    }
    let list = byDay.get(dayIndex);
    if (!list) {
      list = [];
      byDay.set(dayIndex, list);
    }
    return list;
  }

  conflicts(
    teacherId: string,
    roomId: string,
    dayIndex: number,
    startMinutes: number,
    endMinutes: number,
  ): boolean {
    const teacherDay = this.entriesFor(this.byTeacher, teacherId, dayIndex);
    if (
      teacherDay.some((interval) =>
        intervalsOverlap(
          interval.startMinutes,
          interval.endMinutes,
          startMinutes,
          endMinutes,
        ),
      )
    ) {
      return true;
    }
    const roomDay = this.entriesFor(this.byRoom, roomId, dayIndex);
    return roomDay.some((interval) =>
      intervalsOverlap(
        interval.startMinutes,
        interval.endMinutes,
        startMinutes,
        endMinutes,
      ),
    );
  }

  add(
    teacherId: string,
    roomId: string,
    dayIndex: number,
    startMinutes: number,
    endMinutes: number,
  ): void {
    this.entriesFor(this.byTeacher, teacherId, dayIndex).push({
      startMinutes,
      endMinutes,
    });
    this.entriesFor(this.byRoom, roomId, dayIndex).push({
      startMinutes,
      endMinutes,
    });
  }

  remove(
    teacherId: string,
    roomId: string,
    dayIndex: number,
    startMinutes: number,
    endMinutes: number,
  ): void {
    removeEntry(
      this.entriesFor(this.byTeacher, teacherId, dayIndex),
      startMinutes,
      endMinutes,
    );
    removeEntry(
      this.entriesFor(this.byRoom, roomId, dayIndex),
      startMinutes,
      endMinutes,
    );
  }
}

function removeEntry(
  list: Interval[],
  startMinutes: number,
  endMinutes: number,
): void {
  for (let index = list.length - 1; index >= 0; index--) {
    const entry = list[index];
    if (
      entry.startMinutes === startMinutes &&
      entry.endMinutes === endMinutes
    ) {
      list.splice(index, 1);
      return;
    }
  }
}

function slotDurationOf(
  timeSlots: readonly SchedulingInput["timeSlots"][number][],
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

export function validateSchedulingInput(
  input: SchedulingInput,
): CspInfeasibleReason | null {
  if (input.subjects.length === 0) {
    return {
      code: "no-subjects",
      message: "No subjects to schedule. Add subjects first.",
    };
  }
  if (input.rooms.length === 0) {
    return {
      code: "no-rooms",
      message: "No rooms available. Add rooms before generating a schedule.",
    };
  }

  const slotDuration = slotDurationOf(input.timeSlots);
  if (slotDuration <= 0) {
    return {
      code: "invalid-duration",
      message: "The time grid is misconfigured.",
    };
  }

  for (const subject of input.subjects) {
    const patternDays = DAY_PATTERN_DAY_INDEXES[subject.dayPattern];
    if (!patternDays || patternDays.length !== 2) {
      return {
        code: "invalid-pattern",
        message: `"${subject.name}" has an unknown day pattern, expected MW or TTh.`,
      };
    }
    if (
      subject.durationMinutes <= 0 ||
      subject.durationMinutes % slotDuration !== 0
    ) {
      return {
        code: "invalid-duration",
        message: `"${subject.name}" runs ${subject.durationMinutes} minutes, which doesn't fit whole ${slotDuration}-minute blocks.`,
      };
    }
  }

  return null;
}

export function expandSubjectsIntoSessions(input: SchedulingInput): {
  units: SubjectUnit[];
  reasons: InfeasibilityReason[];
  reason: CspInfeasibleReason | null;
} {
  const slotDuration = slotDurationOf(input.timeSlots);
  const units: SubjectUnit[] = [];
  const reasons: InfeasibilityReason[] = [];

  for (const subject of input.subjects) {
    const patternDays = DAY_PATTERN_DAY_INDEXES[subject.dayPattern] ?? [];

    const roomMatches = input.rooms.some(
      (room) =>
        room.id === subject.roomId && room.type === subject.requiredRoomType,
    );
    if (!roomMatches) {
      return {
        units: [],
        reasons: [],
        reason: {
          code: "no-matching-room",
          message: `"${subject.name}" has no ${subject.requiredRoomType} room assigned. The assigned room is missing or the wrong type.`,
        },
      };
    }

    const meetingsPerSlot = subject.durationMinutes / slotDuration;
    const blocked = blockedByDayFor(subject.teacherId, input.availability);
    const candidates: TimeOption[] = [];

    for (let start = 0; start + meetingsPerSlot <= input.timeSlots.length; start++) {
      const covered = input.timeSlots.slice(start, start + meetingsPerSlot);
      const teacherUnavailableOnAnyPatternDay = covered.some((slot) =>
        patternDays.some(
          (dayIndex) => blocked.get(dayIndex)?.has(slot.index) ?? false,
        ),
      );
      if (teacherUnavailableOnAnyPatternDay) {
        continue;
      }
      candidates.push({
        startMinutes: covered[0].startMinutes,
        endMinutes: covered[covered.length - 1].endMinutes,
      });
    }

    if (candidates.length === 0) {
      reasons.push(explainInfeasibility(subject, input, []));
      continue;
    }

    units.push({
      unitKey: subject.id,
      subject,
      days: patternDays,
      candidates,
    });
  }

  return { units, reasons, reason: null };
}

function toPlacedSessions(placement: SubjectPlacement): PlacedSession[] {
  return placement.unit.days.map((dayIndex) => ({
    subjectId: placement.unit.subject.id,
    teacherId: placement.unit.subject.teacherId,
    roomId: placement.unit.subject.roomId,
    dayIndex,
    startMinutes: placement.option.startMinutes,
    endMinutes: placement.option.endMinutes,
  }));
}

export function greedyDecode(
  unitsInOrder: readonly SubjectUnit[],
): PlacedSession[] | null {
  const tracker = new OccupancyTracker();
  const result: PlacedSession[] = [];

  for (const unit of unitsInOrder) {
    const option = unit.candidates.find(
      (candidate) =>
        !unit.days.some((dayIndex) =>
          tracker.conflicts(
            unit.subject.teacherId,
            unit.subject.roomId,
            dayIndex,
            candidate.startMinutes,
            candidate.endMinutes,
          ),
        ),
    );
    if (!option) {
      return null;
    }
    for (const dayIndex of unit.days) {
      tracker.add(
        unit.subject.teacherId,
        unit.subject.roomId,
        dayIndex,
        option.startMinutes,
        option.endMinutes,
      );
      result.push({
        subjectId: unit.subject.id,
        teacherId: unit.subject.teacherId,
        roomId: unit.subject.roomId,
        dayIndex,
        startMinutes: option.startMinutes,
        endMinutes: option.endMinutes,
      });
    }
  }

  return result;
}

/**
 * Greedy placement pass used to explain an otherwise-inscrutable backtracking
 * failure. The CSP search stops as soon as it finds a valid schedule, so when
 * it exhausts there is no "near-complete" partial assignment to inspect; a
 * greedy attempt in the same ordering surfaces the first subject(s) that
 * collide with the rest and assigns a per-subject cause over that partial
 * state.
 */
export function diagnoseFailedPlacement(
  orderedUnits: readonly SubjectUnit[],
  input: SchedulingInput,
): InfeasibilityReason[] {
  const tracker = new OccupancyTracker();
  const placed: PlacedSession[] = [];
  const reasons: InfeasibilityReason[] = [];

  for (const unit of orderedUnits) {
    const option = unit.candidates.find(
      (candidate) =>
        !unit.days.some((dayIndex) =>
          tracker.conflicts(
            unit.subject.teacherId,
            unit.subject.roomId,
            dayIndex,
            candidate.startMinutes,
            candidate.endMinutes,
          ),
        ),
    );
    if (option) {
      for (const dayIndex of unit.days) {
        tracker.add(
          unit.subject.teacherId,
          unit.subject.roomId,
          dayIndex,
          option.startMinutes,
          option.endMinutes,
        );
        placed.push({
          subjectId: unit.subject.id,
          teacherId: unit.subject.teacherId,
          roomId: unit.subject.roomId,
          dayIndex,
          startMinutes: option.startMinutes,
          endMinutes: option.endMinutes,
        });
      }
      continue;
    }
    reasons.push(explainInfeasibility(unit.subject, input, placed));
  }

  return reasons;
}

export function runCSP(input: SchedulingInput): CspResult {
  const validationReason = validateSchedulingInput(input);
  if (validationReason) {
    return { ok: false, reason: validationReason };
  }

  const built = expandSubjectsIntoSessions(input);
  if (built.reason) {
    return { ok: false, reason: built.reason };
  }
  if (built.reasons.length > 0) {
    return { ok: false, reasons: built.reasons };
  }
  if (built.units.length === 0) {
    return {
      ok: false,
      reason: { code: "no-subjects", message: "No subjects to schedule." },
    };
  }

  const orderedUnits = [...built.units].sort(
    (a, b) =>
      a.candidates.length - b.candidates.length ||
      a.unitKey.localeCompare(b.unitKey),
  );

  const tracker = new OccupancyTracker();
  const assignments: (SubjectPlacement | null)[] = new Array(
    orderedUnits.length,
  ).fill(null);
  let attempts = 0;

  function unitConflicts(unit: SubjectUnit, option: TimeOption): boolean {
    return unit.days.some((dayIndex) =>
      tracker.conflicts(
        unit.subject.teacherId,
        unit.subject.roomId,
        dayIndex,
        option.startMinutes,
        option.endMinutes,
      ),
    );
  }

  function placeUnit(unit: SubjectUnit, option: TimeOption): void {
    for (const dayIndex of unit.days) {
      tracker.add(
        unit.subject.teacherId,
        unit.subject.roomId,
        dayIndex,
        option.startMinutes,
        option.endMinutes,
      );
    }
  }

  function unplaceUnit(unit: SubjectUnit, option: TimeOption): void {
    for (const dayIndex of unit.days) {
      tracker.remove(
        unit.subject.teacherId,
        unit.subject.roomId,
        dayIndex,
        option.startMinutes,
        option.endMinutes,
      );
    }
  }

  function search(index: number): boolean {
    attempts += 1;
    if (attempts > MAX_ATTEMPTS) {
      return false;
    }
    if (index === orderedUnits.length) {
      return true;
    }

    const unit = orderedUnits[index];
    for (const option of unit.candidates) {
      if (unitConflicts(unit, option)) {
        continue;
      }
      placeUnit(unit, option);
      assignments[index] = { unit, option };
      if (search(index + 1)) {
        return true;
      }
      assignments[index] = null;
      unplaceUnit(unit, option);
    }
    return false;
  }

  if (!search(0)) {
    return {
      ok: false,
      reasons: diagnoseFailedPlacement(orderedUnits, input),
    };
  }

  return {
    ok: true,
    solution: assignments
      .filter((placement): placement is SubjectPlacement => placement !== null)
      .flatMap(toPlacedSessions),
  };
}