import { internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type LegacySubject = Omit<Doc<"subjects">, "roomId"> & {
  roomId?: Id<"rooms">;
  roomType?: "lecture" | "lab";
};

export const backfillSubjectRoomIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const subjects = await ctx.db.query("subjects").collect();
    const legacySubjects = subjects.filter(
      (subject) => !(subject as LegacySubject).roomId,
    ) as LegacySubject[];

    if (legacySubjects.length === 0) {
      return { backfilled: 0 };
    }

    const rooms = await ctx.db.query("rooms").collect();
    const roomIdByType: Partial<Record<"lecture" | "lab", Id<"rooms">>> = {};
    for (const room of rooms) {
      roomIdByType[room.type] ??= room._id;
    }

    const now = Date.now();
    let backfilled = 0;

    for (const subject of legacySubjects) {
      const type = subject.roomType ?? "lecture";
      let roomId = roomIdByType[type];

      if (!roomId) {
        roomId = await ctx.db.insert("rooms", {
          name: type === "lab" ? "Legacy Lab" : "Legacy Lecture",
          type,
          createdAt: now,
          updatedAt: now,
        });
        roomIdByType[type] = roomId;
      }

      await ctx.db.replace(subject._id, {
        name: subject.name,
        durationMinutes: subject.durationMinutes,
        meetingsPerWeek: subject.meetingsPerWeek,
        roomId,
        teacherId: subject.teacherId,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
      });
      backfilled += 1;
    }

    return { backfilled };
  },
});