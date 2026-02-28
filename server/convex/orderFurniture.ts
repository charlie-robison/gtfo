/**
 * Order Furniture — kickoff action + background worker.
 *
 * The HTTP handler calls `kickoff` which returns immediately with a job ID.
 * The long-running browser-use work runs in `worker` via ctx.scheduler.
 */

import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server.js";
import { internal, api } from "./_generated/api.js";
import { browserUse } from "./browserUse.js";
import { buildFurnitureCartTask } from "./lib/prompts.js";

// ── Internal Mutations ──────────────────────────────────────────

export const insertOrderSummary = internalMutation({
  args: { summary: v.string() },
  handler: async (ctx, { summary }) => {
    return ctx.db.insert("amazonOrderSummary", { summary });
  },
});

// ── Kickoff (called by HTTP handler — returns immediately) ──────

export const kickoff = internalAction({
  args: {},
  returns: v.any(),
  handler: async (ctx): Promise<Record<string, unknown>> => {
    const furnitureDocs: Array<{ amazonSearchQuery: string }> =
      await ctx.runQuery(api.movingPipeline.listRecommendedFurniture, {});

    const searchQueries: string[] = furnitureDocs.map(
      (doc) => doc.amazonSearchQuery
    );

    if (searchQueries.length === 0) {
      return { error: "No recommended furniture found. Run movingPipeline first." };
    }

    const jobId = await ctx.runMutation(api.jobs.create, {
      type: "order_furniture",
      params: { items: searchQueries },
    });

    // Schedule background worker
    await ctx.scheduler.runAfter(0, internal.orderFurniture.worker, {
      jobId,
      items: searchQueries,
    });

    return { job_id: jobId };
  },
});

// ── Background Worker (long-running browser-use task) ───────────

export const worker = internalAction({
  args: {
    jobId: v.id("jobs"),
    items: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const taskPrompt = buildFurnitureCartTask(args.items);

    try {
      const taskResult = await browserUse.createTask(ctx, {
        task: taskPrompt,
        startUrl: "https://www.amazon.com",
        maxSteps: 100,
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
        const taskDetail = await browserUse.fetchTaskDetail(ctx, {
          externalId: taskResult.externalId,
        });
        const agentOutput = taskDetail.output ?? "";

        await ctx.runMutation(internal.orderFurniture.insertOrderSummary, {
          summary: agentOutput,
        });

        await ctx.runMutation(api.jobs.complete, {
          jobId: args.jobId,
          result: { summary: agentOutput },
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
