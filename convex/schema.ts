import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  jobs: defineTable({
    type: v.string(), // search_rentals | order_uhaul | update_address | order_furniture
    status: v.string(), // pending | running | completed | failed
    params: v.any(),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    browserUseExternalId: v.optional(v.string()),
    browserUseTaskId: v.optional(v.string()),
  }),

  steps: defineTable({
    stepNum: v.number(),
    stepName: v.string(),
    currentCost: v.number(),
  }),

  search_constraints: defineTable({
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
  }),

  current_house_information: defineTable({
    description: v.string(),
    estimatedBedrooms: v.number(),
    estimatedSquareFootage: v.number(),
    stuffVolumeEstimate: v.string(),
    recommendedTruckSize: v.string(),
    reasoning: v.string(),
    recommendedWorkers: v.number(),
    laborReasoning: v.string(),
  }),

  redfin_applications: defineTable({
    address: v.string(),
    monthlyRentPrice: v.number(),
    numBedrooms: v.number(),
    numBathrooms: v.number(),
    squareFootage: v.number(),
    moveInCost: v.number(),
    url: v.string(),
  }),

  uhaul_information: defineTable({
    vehicle: v.string(),
    pickupLocation: v.string(),
    pickupTime: v.string(),
    dropOffLocation: v.string(),
    movingHelpProvider: v.string(),
    numWorkers: v.number(),
    numHours: v.number(),
    totalCost: v.number(),
  }),

  recommended_furniture: defineTable({
    itemName: v.string(),
    room: v.string(),
    amazonSearchQuery: v.string(),
    priority: v.string(), // essential | nice-to-have
  }),

  amazon_order_summary: defineTable({
    summary: v.string(),
  }),

  screenshots: defineTable({
    jobId: v.id("jobs"),
    jobType: v.string(), // search_rentals | order_uhaul | update_address | order_furniture
    stepNumber: v.number(),
    pageUrl: v.string(),
    pageTitle: v.string(),
    storageId: v.id("_storage"),
  })
    .index("by_job_type", ["jobType"])
    .index("by_job_id", ["jobId"]),
});
