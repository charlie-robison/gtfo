import { query } from "./_generated/server";
import { v } from "convex/values";

export const listJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("jobs").collect();
  },
});

export const getJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

export const listSteps = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("steps").collect();
  },
});

export const listSearchConstraints = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("search_constraints").collect();
  },
});

export const listHouseInformation = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("current_house_information").collect();
  },
});

export const listRedfinApplications = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("redfin_applications").collect();
  },
});

export const listUhaulInformation = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("uhaul_information").collect();
  },
});

export const listRecommendedFurniture = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("recommended_furniture").collect();
  },
});

export const listAmazonOrderSummary = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("amazon_order_summary").collect();
  },
});

export const listDetectedServices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("detected_services").collect();
  },
});

export const listFoundRedfinApplications = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("redfin_applications").collect();
    return all.filter((app) => app.applicationStatus === "found");
  },
});

export const listScreenshotsByJobType = query({
  args: { jobType: v.string() },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("screenshots")
      .withIndex("by_job_type", (q) => q.eq("jobType", args.jobType))
      .collect();
    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );
  },
});

export const listScreenshotsByJobId = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("screenshots")
      .withIndex("by_job_id", (q) => q.eq("jobId", args.jobId))
      .collect();
    return await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        url: await ctx.storage.getUrl(doc.storageId),
      })),
    );
  },
});
