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
