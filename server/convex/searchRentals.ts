/**
 * Search Rentals — kickoff action, background worker, mutations, and queries.
 *
 * The HTTP handler calls `kickoff` which returns immediately with a job ID.
 * The long-running browser-use work runs in `worker` via ctx.scheduler.
 */

import { v } from "convex/values";
import { internalAction, mutation, query, internalMutation } from "./_generated/server.js";
import { internal, api } from "./_generated/api.js";
import { browserUse } from "./browserUse.js";
import { buildRedfinSearchTask } from "./lib/prompts.js";
import { parseRedfinResults } from "./lib/openai.js";

// ── Queries ─────────────────────────────────────────────────────

export const listConstraints = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("searchConstraints").collect();
  },
});

export const listApplications = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("redfinApplications").collect();
  },
});

// ── Mutations ───────────────────────────────────────────────────

export const insertApplication = internalMutation({
  args: {
    address: v.string(),
    monthlyRentPrice: v.number(),
    numBedrooms: v.number(),
    numBathrooms: v.number(),
    squareFootage: v.number(),
    moveInCost: v.number(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("redfinApplications", args);
  },
});

export const saveConstraints = mutation({
  args: {
    budget: v.number(),
    city: v.string(),
    state: v.string(),
    fullName: v.string(),
    phone: v.string(),
    moveInDate: v.string(),
    minBedrooms: v.number(),
    minBathrooms: v.number(),
    maxResults: v.number(),
    initialAddress: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("searchConstraints", args);
  },
});

// ── Kickoff (called by HTTP handler — returns immediately) ──────

export const kickoff = internalAction({
  args: {
    budget: v.number(),
    city: v.string(),
    state: v.string(),
    fullName: v.string(),
    phone: v.string(),
    moveInDate: v.string(),
    minBedrooms: v.optional(v.number()),
    minBathrooms: v.optional(v.number()),
    initialAddress: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const maxResults = 5;
    const minBedrooms = args.minBedrooms ?? 1;
    const minBathrooms = args.minBathrooms ?? 1;

    // Store search constraints
    await ctx.runMutation(api.searchRentals.saveConstraints, {
      budget: args.budget,
      city: args.city,
      state: args.state,
      fullName: args.fullName,
      phone: args.phone,
      moveInDate: args.moveInDate,
      minBedrooms,
      minBathrooms,
      maxResults,
      initialAddress: args.initialAddress ?? "",
    });

    // Store pipeline step
    await ctx.runMutation(api.data.insertStep, {
      stepNum: 0,
      stepName: "Apply to Listings",
      currentCost: 0,
    });

    // Create job
    const jobId = await ctx.runMutation(api.jobs.create, {
      type: "search_rentals",
      params: {
        city: args.city,
        state: args.state,
        maxRent: args.budget - 1000,
        fullName: args.fullName,
        phone: args.phone,
        moveInDate: args.moveInDate,
        minBedrooms,
        minBathrooms,
        maxResults,
      },
    });

    // Schedule background worker (runs asynchronously)
    await ctx.scheduler.runAfter(0, internal.searchRentals.worker, {
      jobId,
      city: args.city,
      state: args.state,
      maxRent: args.budget - 1000,
      fullName: args.fullName,
      phone: args.phone,
      moveInDate: args.moveInDate,
      minBedrooms,
      minBathrooms,
      maxResults,
    });

    return { job_id: jobId };
  },
});

// ── Background Worker (long-running browser-use task) ───────────

export const worker = internalAction({
  args: {
    jobId: v.id("jobs"),
    city: v.string(),
    state: v.string(),
    maxRent: v.number(),
    fullName: v.string(),
    phone: v.string(),
    moveInDate: v.string(),
    minBedrooms: v.number(),
    minBathrooms: v.number(),
    maxResults: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const taskPrompt = buildRedfinSearchTask({
      city: args.city,
      state: args.state,
      maxRent: args.maxRent,
      fullName: args.fullName,
      phone: args.phone,
      moveInDate: args.moveInDate,
      minBedrooms: args.minBedrooms,
      minBathrooms: args.minBathrooms,
      maxResults: args.maxResults,
    });

    try {
      const taskResult = await browserUse.createTask(ctx, {
        task: taskPrompt,
        startUrl: "https://www.redfin.com",
        maxSteps: 100,
        vision: true,
        secrets: {
          x_redfin_email: process.env.REDFIN_EMAIL ?? "",
        },
        allowedDomains: ["redfin.com", "www.redfin.com"],
      });

      await ctx.runMutation(api.jobs.setRunning, {
        jobId: args.jobId,
        browserUseTaskId: taskResult.taskId,
        browserUseExternalId: taskResult.externalId,
      });

      // Poll for task completion
      let taskStatus = await browserUse.fetchTaskStatus(ctx, {
        externalId: taskResult.externalId,
      });

      while (
        taskStatus.status !== "completed" &&
        taskStatus.status !== "failed"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        taskStatus = await browserUse.fetchTaskStatus(ctx, {
          externalId: taskResult.externalId,
        });
      }

      if (taskStatus.status === "failed") {
        await ctx.runMutation(api.jobs.fail, {
          jobId: args.jobId,
          errorMessage: "Browser Use task failed",
        });
        return null;
      }

      const taskDetail = await browserUse.fetchTaskDetail(ctx, {
        externalId: taskResult.externalId,
      });

      const agentOutput = taskDetail.output ?? "";
      const listings = await parseRedfinResults(agentOutput);

      for (const listing of listings) {
        await ctx.runMutation(internal.searchRentals.insertApplication, {
          address: listing.address ?? "",
          monthlyRentPrice: listing.monthlyRentPrice ?? 0,
          numBedrooms: listing.numBedrooms ?? 0,
          numBathrooms: listing.numBathrooms ?? 0,
          squareFootage: listing.squareFootage ?? 0,
          moveInCost: listing.moveInCost ?? 0,
          url: listing.url ?? "",
        });
      }

      await ctx.runMutation(api.jobs.complete, {
        jobId: args.jobId,
        result: { listingsCount: listings.length },
      });
    } catch (error: any) {
      await ctx.runMutation(api.jobs.fail, {
        jobId: args.jobId,
        errorMessage: `${error.name}: ${error.message}`,
      });
    }

    return null;
  },
});
