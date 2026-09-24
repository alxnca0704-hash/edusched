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
  subjects: defineTable({
    name: v.string(),
    durationMinutes: v.number(),
    meetingsPerWeek: v.number(),
    roomType: v.union(v.literal("lecture"), v.literal("lab")),
    teacherId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teacherId", ["teacherId"]),
});