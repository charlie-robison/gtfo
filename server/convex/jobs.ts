/**
 * Job management — mutations and queries.
 *
 * Jobs track background browser-use tasks with status transitions:
 *   pending → running → completed | failed
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

// ── Queries ─────────────────────────────────────────────────────

export const get = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    return ctx.db.get(jobId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("jobs").collect();
  },
});

export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, { status }) => {
    return ctx.db
      .query("jobs")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────

export const create = mutation({
  args: {
    type: v.string(),
    params: v.any(),
  },
  handler: async (ctx, { type, params }) => {
    return ctx.db.insert("jobs", {
      type,
      status: "pending",
      params,
      result: undefined,
      errorMessage: undefined,
      browserUseTaskId: undefined,
      browserUseExternalId: undefined,
    });
  },
});

export const setRunning = mutation({
  args: {
    jobId: v.id("jobs"),
    browserUseTaskId: v.optional(v.string()),
    browserUseExternalId: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, browserUseTaskId, browserUseExternalId }) => {
    await ctx.db.patch(jobId, {
      status: "running",
      browserUseTaskId,
      browserUseExternalId,
    });
  },
});

export const complete = mutation({
  args: {
    jobId: v.id("jobs"),
    result: v.any(),
  },
  handler: async (ctx, { jobId, result }) => {
    await ctx.db.patch(jobId, {
      status: "completed",
      result,
    });
  },
});

export const fail = mutation({
  args: {
    jobId: v.id("jobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { jobId, errorMessage }) => {
    await ctx.db.patch(jobId, {
      status: "failed",
      errorMessage,
    });
  },
});
