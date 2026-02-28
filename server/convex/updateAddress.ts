/**
 * Update Address — kickoff action + background worker.
 *
 * The HTTP handler calls `kickoff` which returns immediately with a job ID.
 * The long-running browser-use work runs in `worker` via ctx.scheduler.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";
import { internal, api } from "./_generated/api.js";
import { browserUse } from "./browserUse.js";
import { buildUpdateAddressTask } from "./lib/prompts.js";

// ── Kickoff (called by HTTP handler — returns immediately) ──────

export const kickoff = internalAction({
  args: {
    fullName: v.string(),
    streetAddress: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const params = {
      fullName: args.fullName,
      streetAddress: args.streetAddress,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      phone: args.phone ?? "",
    };

    const jobId = await ctx.runMutation(api.jobs.create, {
      type: "update_address",
      params,
    });

    // Schedule background worker
    await ctx.scheduler.runAfter(0, internal.updateAddress.worker, {
      jobId,
      fullName: args.fullName,
      streetAddress: args.streetAddress,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      phone: args.phone,
    });

    return { job_id: jobId };
  },
});

// ── Background Worker (long-running browser-use task) ───────────

export const worker = internalAction({
  args: {
    jobId: v.id("jobs"),
    fullName: v.string(),
    streetAddress: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    phone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const taskPrompt = buildUpdateAddressTask({
      fullName: args.fullName,
      streetAddress: args.streetAddress,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      phone: args.phone,
    });

    try {
      const taskResult = await browserUse.createTask(ctx, {
        task: taskPrompt,
        startUrl: "https://www.amazon.com/a/addresses",
        maxSteps: 50,
        vision: true,
        secrets: {
          x_amazon_email: process.env.AMAZON_EMAIL ?? "",
          x_amazon_pass: process.env.AMAZON_PASSWORD ?? "",
        },
        allowedDomains: ["amazon.com", "www.amazon.com"],
      });

      await ctx.runMutation(api.jobs.setRunning, {
        jobId: args.jobId,
        browserUseTaskId: taskResult.taskId,
        browserUseExternalId: taskResult.externalId,
      });

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

      if (taskStatus.status === "completed") {
        await ctx.runMutation(api.jobs.complete, {
          jobId: args.jobId,
          result: "Updated all addresses to new address!",
        });
      } else {
        await ctx.runMutation(api.jobs.fail, {
          jobId: args.jobId,
          errorMessage: "Browser Use task failed",
        });
      }
    } catch (error: any) {
      await ctx.runMutation(api.jobs.fail, {
        jobId: args.jobId,
        errorMessage: `${error.name}: ${error.message}`,
      });
    }

    return null;
  },
});
