import { mutation, query } from "./_generated/server";

import { roleOf } from "./roles";

export const upsertUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const clerkId = identity.subject;
    const role = roleOf(identity);
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: identity.email ?? existing.email,
        firstName: identity.givenName ?? existing.firstName,
        lastName: identity.familyName ?? existing.lastName,
        role: role ?? existing.role,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkId,
      email: identity.email ?? "",
      firstName: identity.givenName,
      lastName: identity.familyName,
      role,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});