import { runCSP } from "../convex/scheduling/csp";
import { runGA } from "../convex/scheduling/ga";
import { validateSolution } from "../convex/scheduling/validate";
import type {
  PlacedSession,
  SchedulingAvailability,
  SchedulingDay,
  SchedulingInput,
  SchedulingRoom,
  SchedulingSubject,
  SchedulingTimeSlot,
} from "../convex/scheduling/types";
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_TIME_SLOTS,
} from "../constants/availability";

const DAYS: SchedulingDay[] = AVAILABILITY_DAYS.map((day) => ({
  index: day.index,
  name: day.name,
  shortName: day.shortName,
}));

const TIME_SLOTS: SchedulingTimeSlot[] = AVAILABILITY_TIME_SLOTS.map((slot) => ({
  index: slot.index,
  startMinutes: slot.startMinutes,
  endMinutes: slot.endMinutes,
}));

const ROOMS: SchedulingRoom[] = [
  { id: "room-lecture-1", name: "Lecture Hall 1", type: "lecture" },
  { id: "room-lecture-2", name: "Lecture Hall 2", type: "lecture" },
  { id: "room-lab-1", name: "Physics Lab", type: "lab" },
];

const SUBJECTS: SchedulingSubject[] = [
  {
    id: "s1",
    name: "Math 101",
    teacherId: "t1",
    roomId: "room-lecture-1",
    requiredRoomType: "lecture",
    durationMinutes: 60,
    dayPattern: "MW",
  },
  {
    id: "s2",
    name: "English 101",
    teacherId: "t2",
    roomId: "room-lecture-2",
    requiredRoomType: "lecture",
    durationMinutes: 60,
    dayPattern: "TTh",
  },
  {
    id: "s3",
    name: "Physics Lab",
    teacherId: "t1",
    roomId: "room-lab-1",
    requiredRoomType: "lab",
    durationMinutes: 60,
    dayPattern: "TTh",
  },
];

const AVAILABILITY: SchedulingAvailability[] = [
  {
    teacherId: "t1",
    blockedByDay: [{ dayIndex: 2, slotIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8] }],
  },
  {
    teacherId: "t2",
    blockedByDay: [{ dayIndex: 1, slotIndexes: [0] }],
  },
];

function buildInput(
  subjects = SUBJECTS,
  rooms = ROOMS,
  availability = AVAILABILITY,
): SchedulingInput {
  return { days: DAYS, timeSlots: TIME_SLOTS, rooms, subjects, availability };
}

function sessionsBySubject(
  solution: readonly PlacedSession[],
): Map<string, PlacedSession[]> {
  const bySubject = new Map<string, PlacedSession[]>();
  for (const placement of solution) {
    const list = bySubject.get(placement.subjectId) ?? [];
    bySubject.set(placement.subjectId, list);
    list.push(placement);
  }
  return bySubject;
}

function assertPatternPair(
  solution: readonly PlacedSession[],
  subject: SchedulingSubject,
  expectedDays: readonly number[],
): boolean {
  const sessions = sessionsBySubject(solution).get(subject.id) ?? [];
  if (sessions.length !== 2) {
    return false;
  }
  const actualDays = sessions.map((session) => session.dayIndex).sort((a, b) => a - b);
  const sameDays =
    actualDays.length === expectedDays.length &&
    actualDays.every((day, index) => day === expectedDays[index]);
  const [first, second] = [...sessions].sort((a, b) => a.dayIndex - b.dayIndex);
  const sameTime =
    first.startMinutes === second.startMinutes &&
    first.endMinutes === second.endMinutes;
  return sameDays && sameTime && first.roomId === second.roomId;
}

let failures = 0;
let assertions = 0;

function check(condition: boolean, label: string): void {
  assertions += 1;
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${label}`);
  }
}

function allBlockedAvailability(teachers: readonly string[]): SchedulingAvailability[] {
  const allSlots = AVAILABILITY_TIME_SLOTS.map((slot) => slot.index);
  return teachers.map((teacherId) => ({
    teacherId,
    blockedByDay: DAYS.map((day) => ({
      dayIndex: day.index,
      slotIndexes: allSlots,
    })),
  }));
}

function expectSingleReason(
  result: ReturnType<typeof runCSP>,
  cause: "no-shared-teacher-window" | "no-room-available" | "unknown",
): boolean {
  return (
    !result.ok &&
    "reasons" in result &&
    result.reasons.length > 0 &&
    result.reasons.some((reason) => reason.cause === cause)
  );
}

function main() {
  console.log("CSP: feasible case");
  const feasible = buildInput();
  const cspResult = runCSP(feasible);
  check(cspResult.ok, "runCSP returns ok for the feasible input");
  if (!cspResult.ok) {
    if ("reasons" in cspResult) {
      cspResult.reasons.forEach((reason) => console.error(`  - ${reason.message}`));
    } else {
      console.error(`  reason: ${cspResult.reason.message}`);
    }
  } else {
    const expectedSessions = SUBJECTS.length * 2;
    check(
      cspResult.solution.length === expectedSessions,
      `CSP places exactly ${expectedSessions} sessions (2 per subject)`,
    );
    const validation = validateSolution(feasible, cspResult.solution);
    check(validation.valid, "CSP solution has zero hard-constraint violations");
    if (!validation.valid) {
      validation.violations.forEach((violation) => console.error(`  - ${violation}`));
    }

    console.log("CSP: fixed day-pairs");
    for (const subject of SUBJECTS) {
      const expectedDays = subject.dayPattern === "MW" ? [0, 2] : [1, 3];
      check(
        assertPatternPair(cspResult.solution, subject, expectedDays),
        `"${subject.name}" (${subject.dayPattern}) lands on days ${expectedDays.join(",")} at the same time in the same room`,
      );
    }
  }

  console.log("CSP: blocked on either day forces the pair to a free slot");
  if (cspResult.ok) {
    const mathSessions = sessionsBySubject(cspResult.solution).get("s1") ?? [];
    const anyAtFreeSlot = mathSessions.every(
      (session) => session.startMinutes === 990 && session.endMinutes === 1050,
    );
    check(
      anyAtFreeSlot,
      "Math 101 uses 4:30 PM (slot 9) on both days because Wed slots 0-8 are blocked for t1",
    );
  }

  console.log("GA: seed from CSP must stay valid");
  if (cspResult.ok) {
    const gaResult = runGA(feasible, cspResult.solution);
    const gaValidation = validateSolution(feasible, gaResult);
    check(
      gaValidation.valid,
      "GA output has zero hard-constraint violations",
    );
    if (!gaValidation.valid) {
      gaValidation.violations.forEach((violation) => console.error(`  - ${violation}`));
    }
    check(gaResult.length > 0, "GA returns a non-empty schedule");
    check(
      SUBJECTS.every((subject) =>
        assertPatternPair(
          gaResult,
          subject,
          subject.dayPattern === "MW" ? [0, 2] : [1, 3],
        ),
      ),
      "GA keeps each subject's day-pair (same time, same room) intact",
    );
  }

  console.log("CSP: room overflow reports a per-subject room-caused reason");
  const overbookedRooms: SchedulingRoom[] = [ROOMS[0]];
  const capacityOverflowSubjects: SchedulingSubject[] = Array.from(
    { length: 13 },
    (_, index) => ({
      id: `s-overflow-${index}`,
      name: `Overflow Subject ${index + 1}`,
      teacherId: `t-overflow-${index}`,
      roomId: "room-lecture-1",
      requiredRoomType: "lecture",
      durationMinutes: 60,
      dayPattern: "TTh",
    }),
  );
  const infeasible = buildInput(capacityOverflowSubjects, overbookedRooms, []);
  const infeasibleResult = runCSP(infeasible);
  check(
    expectSingleReason(infeasibleResult, "no-room-available"),
    "13 TTh subjects in one room report a no-room-available reason",
  );

  console.log("CSP: validation reasons");
  const bogusDurationInput = buildInput([
    { ...SUBJECTS[0], durationMinutes: 90, name: "Odd 90-min Math 101" },
  ]);
  const durationResult = runCSP(bogusDurationInput);
  check(
    !durationResult.ok && "reason" in durationResult && durationResult.reason.code === "invalid-duration",
    "non-multiple-of-60 duration is rejected with invalid-duration",
  );

  const bogusPatternInput = buildInput([
    {
      ...SUBJECTS[0],
      dayPattern: "M" as unknown as "MW",
      name: "Unknown pattern subject",
    },
  ]);
  const patternResult = runCSP(bogusPatternInput);
  check(
    !patternResult.ok && "reason" in patternResult && patternResult.reason.code === "invalid-pattern",
    "unknown day pattern is rejected with invalid-pattern",
  );

  console.log("CSP: mirrors current dev data (SE 101, 3-hr lab MW, no availability)");
  const labOnlyRooms: SchedulingRoom[] = [
    { id: "room-it-lab-1", name: "IT Lab 1", type: "lab" },
  ];
  const se101Subjects: SchedulingSubject[] = [
    {
      id: "j975w55epxdeqw45tkc84230218f0nx7",
      name: "SE 101",
      teacherId: "user_3Jj4s0y60y6o4HCpNHhm2HoY4eX",
      roomId: "room-it-lab-1",
      requiredRoomType: "lab",
      durationMinutes: 180,
      dayPattern: "MW",
    },
  ];
  const se101Result = runCSP(buildInput(se101Subjects, labOnlyRooms, []));
  check(se101Result.ok, "CSP places the 3-hour lab subject");
  if (se101Result.ok) {
    const validation = validateSolution(
      buildInput(se101Subjects, labOnlyRooms, []),
      se101Result.solution,
    );
    check(
      validation.valid && se101Result.solution.length === 2,
      "SE 101 placed exactly 2 linked sessions with zero violations",
    );
    check(
      se101Result.solution.every(
        (placement) => placement.endMinutes - placement.startMinutes === 180,
      ),
      "each SE 101 session spans the full 180 minutes",
    );
    check(
      assertPatternPair(se101Result.solution, se101Subjects[0], [0, 2]),
      "SE 101 lands on Mon + Wed at the same time in the same room",
    );
  }

  console.log("CSP: mirrors full dev seed (3 MW labs, one teacher, one room each)");
  const devRooms: SchedulingRoom[] = [
    { id: "room-it-lab-1", name: "IT Lab 1", type: "lab" },
    { id: "room-it-lab-2", name: "IT Lab 2", type: "lab" },
    { id: "room-it-lab-3", name: "IT Lab 3", type: "lab" },
  ];
  const devSubjects: SchedulingSubject[] = [
    {
      id: "j975w55epxdeqw45tkc84230218f0nx7",
      name: "SE 101",
      teacherId: "user_3Jj4s0y60y6o4HCpNHhm2HoY4eX",
      roomId: "room-it-lab-1",
      requiredRoomType: "lab",
      durationMinutes: 180,
      dayPattern: "MW",
    },
    {
      id: "j9777da1b5ajbzsb4ffh9wc2pn8f1h3h",
      name: "HCI 101",
      teacherId: "user_3Jj4s0y60y6o4HCpNHhm2HoY4eX",
      roomId: "room-it-lab-2",
      requiredRoomType: "lab",
      durationMinutes: 120,
      dayPattern: "MW",
    },
    {
      id: "j97c8degzgb88ywsfpck2ahatd8f00cw",
      name: "OS 101",
      teacherId: "user_3Jj4s0y60y6o4HCpNHhm2HoY4eX",
      roomId: "room-it-lab-3",
      requiredRoomType: "lab",
      durationMinutes: 180,
      dayPattern: "MW",
    },
  ];
  const devResult = runCSP(buildInput(devSubjects, devRooms, []));
  check(devResult.ok, "CSP places all 3 dev subjects with one teacher");
  if (devResult.ok) {
    const validation = validateSolution(
      buildInput(devSubjects, devRooms, []),
      devResult.solution,
    );
    check(
      validation.valid && devResult.solution.length === 6,
      "dev seed yields 6 sessions with zero violations (teacher never double-booked)",
    );
    for (const subject of devSubjects) {
      check(
        assertPatternPair(devResult.solution, subject, [0, 2]),
        `"${subject.name}" lands on Mon + Wed at the same time in the same room`,
      );
    }
  }

  console.log("CSP: fully-blocked teachers yield per-subject teacher reasons");
  const noSlotsInput = buildInput(SUBJECTS, ROOMS, allBlockedAvailability(["t1", "t2"]));
  const noSlotsResult = runCSP(noSlotsInput);
  check(
    !noSlotsResult.ok &&
      "reasons" in noSlotsResult &&
      noSlotsResult.reasons.length === SUBJECTS.length &&
      noSlotsResult.reasons.every(
        (reason) => reason.cause === "no-shared-teacher-window",
      ),
    "fully-blocked teachers report one no-shared-teacher-window reason per subject",
  );

  console.log("CSP: teacher free windows overlap on no start across both days");
  const noSharedSubjects: SchedulingSubject[] = [
    {
      id: "s-noshared",
      name: "No Shared 101",
      teacherId: "t-noshared",
      roomId: "room-lecture-1",
      requiredRoomType: "lecture",
      durationMinutes: 60,
      dayPattern: "MW",
    },
  ];
  const noSharedAvailability: SchedulingAvailability[] = [
    {
      teacherId: "t-noshared",
      blockedByDay: [
        { dayIndex: 0, slotIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
        { dayIndex: 2, slotIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
      ],
    },
  ];
  const noSharedResult = runCSP(
    buildInput(noSharedSubjects, ROOMS, noSharedAvailability),
  );
  check(
    expectSingleReason(noSharedResult, "no-shared-teacher-window"),
    "no overlap across Mon & Wed reports no-shared-teacher-window",
  );
  if (!noSharedResult.ok && "reasons" in noSharedResult) {
    const reason = noSharedResult.reasons[0];
    check(reason.subjectName === "No Shared 101", "reason names the failed subject");
    check(
      reason.day1FreeWindows.length === 1 &&
        reason.day1FreeWindows[0].start === 450 &&
        reason.day1FreeWindows[0].end === 510,
      "Mon free window is 7:30 AM–8:30 AM",
    );
    check(
      reason.day2FreeWindows.length === 1 &&
        reason.day2FreeWindows[0].start === 990 &&
        reason.day2FreeWindows[0].end === 1170,
      "Wed free window is 4:30 PM–7:30 PM",
    );
    check(
      reason.message.includes("No matching 60-min start time"),
      "message states no matching start time exists on both days",
    );
  }

  console.log("CSP: room-caused infeasibility is distinct from teacher-caused");
  const crowdedRooms: SchedulingRoom[] = [
    { id: "room-crowded", name: "Crowded Hall", type: "lecture" },
  ];
  const crowdedSubjects: SchedulingSubject[] = [
    {
      id: "a",
      name: "Alpha 101",
      teacherId: "tA",
      roomId: "room-crowded",
      requiredRoomType: "lecture",
      durationMinutes: 60,
      dayPattern: "MW",
    },
    {
      id: "b",
      name: "Beta 101",
      teacherId: "tB",
      roomId: "room-crowded",
      requiredRoomType: "lecture",
      durationMinutes: 60,
      dayPattern: "MW",
    },
  ];
  const crowdedAvailability: SchedulingAvailability[] = [
    {
      teacherId: "tA",
      blockedByDay: [
        { dayIndex: 0, slotIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
        { dayIndex: 2, slotIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      ],
    },
    {
      teacherId: "tB",
      blockedByDay: [
        { dayIndex: 0, slotIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
        { dayIndex: 2, slotIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      ],
    },
  ];
  const crowdedResult = runCSP(
    buildInput(crowdedSubjects, crowdedRooms, crowdedAvailability),
  );
  check(
    expectSingleReason(crowdedResult, "no-room-available"),
    "teacher free on both days but room taken at every shared start reports no-room-available",
  );
  if (!crowdedResult.ok && "reasons" in crowdedResult) {
    const reason = crowdedResult.reasons[0];
    check(reason.subjectName === "Beta 101", "room reason names the blocked subject");
    check(
      reason.day1FreeWindows.length === 1 &&
        reason.day2FreeWindows.length === 1 &&
        reason.day1FreeWindows[0].start === 450 &&
        reason.day2FreeWindows[0].start === 450,
      "room reason still lists the teacher's free windows on both days",
    );
    check(
      reason.message.includes("occupied at every shared start"),
      "room reason message names the root cause",
    );
  }

  const noRoomsInput = buildInput(SUBJECTS, [], AVAILABILITY);
  const noRoomsResult = runCSP(noRoomsInput);
  check(
    !noRoomsResult.ok && "reason" in noRoomsResult && noRoomsResult.reason.code === "no-rooms",
    "empty rooms yields no-rooms reason",
  );

  console.log(`\n${assertions} assertions, ${failures} failures`);
  if (failures > 0) {
    process.exit(1);
  }
}

main();