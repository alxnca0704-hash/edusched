import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("dean"), v.literal("teacher"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkId", ["clerkId"]).index("by_role", ["role"]),
  rooms: defineTable({
    name: v.string(),
    type: v.union(v.literal("lecture"), v.literal("lab")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  subjects: defineTable({
    name: v.string(),
    durationMinutes: v.number(),
    meetingsPerWeek: v.number(),
    roomId: v.id("rooms"),
    teacherId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teacherId", ["teacherId"]),
  availability: defineTable({
    teacherId: v.string(),
    blockedSlots: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teacherId", ["teacherId"]),
});