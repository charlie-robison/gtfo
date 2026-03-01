import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createJob = mutation({
  args: {
    type: v.string(),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("jobs", {
      type: args.type,
      status: "pending",
      params: args.params,
    });
  },
});

export const updateJobStatus = mutation({
  args: {
    jobId: v.id("jobs"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: args.status });
  },
});

export const completeJob = mutation({
  args: {
    jobId: v.id("jobs"),
    result: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "completed", result: args.result });
  },
});

export const failJob = mutation({
  args: {
    jobId: v.id("jobs"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "failed", errorMessage: args.errorMessage });
  },
});

export const cancelJob = mutation({
  args: {
    jobId: v.id("jobs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, { status: "cancelled" });
  },
});

export const insertStep = mutation({
  args: {
    stepNum: v.number(),
    stepName: v.string(),
    currentCost: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("steps", args);
  },
});

export const insertSearchConstraints = mutation({
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
    return await ctx.db.insert("search_constraints", args);
  },
});

export const insertHouseInformation = mutation({
  args: {
    description: v.string(),
    estimatedBedrooms: v.number(),
    estimatedSquareFootage: v.number(),
    stuffVolumeEstimate: v.string(),
    recommendedTruckSize: v.string(),
    reasoning: v.string(),
    recommendedWorkers: v.number(),
    laborReasoning: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("current_house_information", args);
  },
});

export const insertRedfinApplication = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.string(),
    description: v.string(),
    imageUrl: v.string(),
    monthlyRentPrice: v.number(),
    numBedrooms: v.number(),
    numBathrooms: v.number(),
    squareFootage: v.number(),
    moveInCost: v.number(),
    url: v.string(),
    applicationStatus: v.string(),
    applyJobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("redfin_applications", args);
  },
});

export const updateRedfinApplicationStatus = mutation({
  args: {
    applicationId: v.id("redfin_applications"),
    applicationStatus: v.string(),
    applyJobId: v.optional(v.id("jobs")),
  },
  handler: async (ctx, args) => {
    const { applicationId, ...updates } = args;
    await ctx.db.patch(applicationId, updates);
  },
});

export const insertUhaulInformation = mutation({
  args: {
    vehicle: v.string(),
    pickupLocation: v.string(),
    pickupTime: v.string(),
    dropOffLocation: v.string(),
    movingHelpProvider: v.string(),
    numWorkers: v.number(),
    numHours: v.number(),
    totalCost: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("uhaul_information", args);
  },
});

export const insertRecommendedFurniture = mutation({
  args: {
    itemName: v.string(),
    room: v.string(),
    amazonSearchQuery: v.string(),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recommended_furniture", args);
  },
});

export const insertAmazonOrderSummary = mutation({
  args: {
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("amazon_order_summary", args);
  },
});

export const insertDetectedService = mutation({
  args: {
    serviceName: v.string(),
    category: v.string(),
    priority: v.string(),
    detectedFrom: v.array(v.string()),
    emailCount: v.number(),
    settingsUrl: v.optional(v.string()),
    needsAddressUpdate: v.boolean(),
    sampleSender: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("detected_services", args);
  },
});

export const insertScreenshot = mutation({
  args: {
    jobId: v.id("jobs"),
    jobType: v.string(),
    stepNumber: v.number(),
    pageUrl: v.string(),
    pageTitle: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("screenshots", args);
  },
});

export const getLatestSearchConstraints = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("search_constraints").order("desc").first();
    return docs;
  },
});

