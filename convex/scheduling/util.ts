export interface Interval {
  startMinutes: number;
  endMinutes: number;
}

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function blockedByDayFor(
  teacherId: string,
  availability: readonly { teacherId: string; blockedByDay: readonly { dayIndex: number; slotIndexes: readonly number[] }[] }[],
): ReadonlyMap<number, ReadonlySet<number>> {
  const match = availability.find((entry) => entry.teacherId === teacherId);
  const map = new Map<number, Set<number>>();
  for (const blockedDay of match?.blockedByDay ?? []) {
    let set = map.get(blockedDay.dayIndex);
    if (!set) {
      set = new Set();
      map.set(blockedDay.dayIndex, set);
    }
    for (const slotIndex of blockedDay.slotIndexes) {
      set.add(slotIndex);
    }
  }
  return map;
}