import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { roleOf } from "./roles";
import { parseAvailabilityPatternKey } from "../constants/availability";

export function isValidSlotKey(key: string): boolean {
  return parseAvailabilityPatternKey(key) !== null;
}

function toErrorString(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong";
}

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();

      if (!identity || roleOf(identity) !== "teacher") {
        return { ok: true as const, data: [] };
      }

      const doc = await ctx.db
        .query("availability")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", identity.subject))
        .unique();

      return {
        ok: true as const,
        data: doc?.blockedSlots ?? [],
      };
    } catch (error) {
      return { ok: false as const, error: toErrorString(error) };
    }
  },
});

export const setMine = mutation({
  args: { blockedSlots: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity || roleOf(identity) !== "teacher") {
      throw new Error("Unauthorized");
    }

    for (const key of args.blockedSlots) {
      if (!isValidSlotKey(key)) {
        throw new Error(`Invalid availability slot: ${key}`);
      }
    }

    const blockedSlots = [...new Set(args.blockedSlots)];
    const now = Date.now();
    const teacherId = identity.subject;

    const doc = await ctx.db
      .query("availability")
      .withIndex("by_teacherId", (q) => q.eq("teacherId", teacherId))
      .unique();

    if (doc) {
      await ctx.db.patch(doc._id, {
        blockedSlots,
        updatedAt: now,
      });
      return doc._id;
    }

    return ctx.db.insert("availability", {
      teacherId,
      blockedSlots,
      createdAt: now,
      updatedAt: now,
    });
  },
});