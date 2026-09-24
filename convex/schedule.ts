import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import {
  AVAILABILITY_DAYS,
  AVAILABILITY_TIME_SLOTS,
  parseAvailabilitySlotKey,
} from "../constants/availability";
import { runCSP } from "./scheduling/csp";
import { validateSolution } from "./scheduling/validate";
import { isDean } from "./roles";
import type {
  InfeasibilityReason,
  SchedulingAvailability,
  SchedulingInput,
} from "./scheduling/types";

const sessionValidator = v.object({
  subjectId: v.id("subjects"),
  subjectName: v.string(),
  teacherId: v.string(),
  teacherName: v.string(),
  roomId: v.id("rooms"),
  roomName: v.string(),
  roomType: v.union(v.literal("lecture"), v.literal("lab")),
  dayIndex: v.number(),
  startMinutes: v.number(),
  endMinutes: v.number(),
});

function toErrorString(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong";
}

type AvailabilityPayload = {
  teacherId: string;
  blockedSlots: string[];
};

type AvailabilityQueryResult =
  | { ok: true; data: AvailabilityPayload[] }
  | { ok: false; error: string };

type GenerateActionResult =
  | { ok: true; count: number }
  | {
      ok: false;
      error: string;
      infeasibleSubjects?: readonly InfeasibilityReason[];
    };

export const listAvailability = internalQuery({
  args: {},
  handler: async (ctx): Promise<AvailabilityQueryResult> => {
    try {
      const identity = await ctx.auth.getUserIdentity();

      if (!isDean(identity)) {
        return { ok: true, data: [] };
      }

      const docs = await ctx.db.query("availability").collect();

      return {
        ok: true,
        data: docs.map((doc) => ({
          teacherId: doc.teacherId,
          blockedSlots: doc.blockedSlots,
        })),
      };
    } catch (error) {
      return { ok: false, error: toErrorString(error) };
    }
  },
});

export const saveGenerated = internalMutation({
  args: { sessions: v.array(sessionValidator) },
  handler: async (ctx, args): Promise<number> => {
    const now = Date.now();
    const existing = await ctx.db.query("schedules").collect();

    for (const doc of existing) {
      await ctx.db.delete(doc._id);
    }

    let inserted = 0;
    for (const session of args.sessions) {
      await ctx.db.insert("schedules", {
        ...session,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return inserted;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();

      if (!isDean(identity)) {
        return { ok: true as const, data: [] };
      }

      const sessions = await ctx.db.query("schedules").order("asc").collect();

      return { ok: true as const, data: sessions };
    } catch (error) {
      return { ok: false as const, error: toErrorString(error) };
    }
  },
});

interface SubjectRow {
  _id: string;
  name: string;
  teacherId: string;
  roomId: string;
  roomType: "lecture" | "lab";
  teacherName: string;
  durationMinutes: number;
  dayPattern: "MW" | "TTh";
}

interface RoomRow {
  _id: string;
  name: string;
  type: "lecture" | "lab";
}

function buildSchedulingInput(
  subjects: readonly SubjectRow[],
  rooms: readonly RoomRow[],
  availability: readonly AvailabilityPayload[],
): SchedulingInput {
  const roomById = new Map(rooms.map((room) => [room._id, room]));

  const normalizedAvailability: SchedulingAvailability[] = availability.map(
    (entry) => {
      const slotsByDay = new Map<number, number[]>();
      for (const key of entry.blockedSlots) {
        const parsed = parseAvailabilitySlotKey(key);
        if (!parsed) {
          continue;
        }
        const list = slotsByDay.get(parsed.dayIndex) ?? [];
        slotsByDay.set(parsed.dayIndex, list);
        list.push(parsed.timeSlotIndex);
      }
      return {
        teacherId: entry.teacherId,
        blockedByDay: [...slotsByDay.entries()].map(([dayIndex, slotIndexes]) => ({
          dayIndex,
          slotIndexes,
        })),
      };
    },
  );

  return {
    days: AVAILABILITY_DAYS.map((day) => ({ ...day })),
    timeSlots: AVAILABILITY_TIME_SLOTS.map((slot) => ({ ...slot })),
    rooms: rooms.map((room) => ({
      id: room._id,
      name: room.name,
      type: room.type,
    })),
    subjects: subjects.map((subject) => {
      const room = roomById.get(subject.roomId);
      return {
        id: subject._id,
        name: subject.name,
        teacherId: subject.teacherId,
        roomId: subject.roomId,
        requiredRoomType: room?.type ?? subject.roomType,
        durationMinutes: subject.durationMinutes,
        dayPattern: subject.dayPattern,
      };
    }),
    availability: normalizedAvailability,
  };
}

export const generate = action({
  args: {},
  handler: async (ctx): Promise<GenerateActionResult> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || !isDean(identity)) {
      throw new Error("Unauthorized");
    }

    const roomsResult: { ok: true; data: RoomRow[] } | { ok: false; error: string } =
      await ctx.runQuery(api.rooms.listAll);
    if (!roomsResult.ok) {
      return { ok: false as const, error: roomsResult.error };
    }

    const subjectsResult: { ok: true; data: SubjectRow[] } | { ok: false; error: string } =
      await ctx.runQuery(api.subjects.listAll);
    if (!subjectsResult.ok) {
      return { ok: false as const, error: subjectsResult.error };
    }

    const availabilityResult: AvailabilityQueryResult = await ctx.runQuery(
      internal.schedule.listAvailability,
    );
    if (!availabilityResult.ok) {
      return { ok: false as const, error: availabilityResult.error };
    }

    const input = buildSchedulingInput(
      subjectsResult.data,
      roomsResult.data,
      availabilityResult.data,
    );

    const result = runCSP(input);
    if (!result.ok) {
      if ("reason" in result) {
        return { ok: false as const, error: result.reason.message };
      }
      const summary =
        result.reasons.length === 1
          ? result.reasons[0].message
          : `${result.reasons.length} subjects could not be scheduled. Review each one below to see what's blocking it.`;
      return {
        ok: false as const,
        error: summary,
        infeasibleSubjects: result.reasons,
      };
    }

    const validation = validateSolution(input, result.solution);
    if (!validation.valid) {
      return {
        ok: false as const,
        error: `Generated schedule failed internal validation: ${validation.violations.join("; ")}`,
      };
    }

    const subjectById = new Map(subjectsResult.data.map((subject) => [subject._id, subject]));
    const roomById = new Map(roomsResult.data.map((room) => [room._id, room]));

    const sessions = result.solution.map((placement) => {
      const subject = subjectById.get(placement.subjectId);
      const room = roomById.get(placement.roomId);
      return {
        subjectId: placement.subjectId as Id<"subjects">,
        subjectName: subject?.name ?? "Unknown",
        teacherId: placement.teacherId,
        teacherName: subject?.teacherName ?? "Unknown",
        roomId: placement.roomId as Id<"rooms">,
        roomName: room?.name ?? "Unknown",
        roomType: room?.type ?? "lecture",
        dayIndex: placement.dayIndex,
        startMinutes: placement.startMinutes,
        endMinutes: placement.endMinutes,
      };
    });

    const saved: number = await ctx.runMutation(
      internal.schedule.saveGenerated,
      { sessions },
    );

    return { ok: true as const, count: saved };
  },
});