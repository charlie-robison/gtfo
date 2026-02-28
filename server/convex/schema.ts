/**
 * Convex Database Schema
 *
 * Preserves all collections from the original MongoDB backend:
 *   steps, jobs, searchConstraints, currentHouseInformation,
 *   redfinApplications, uhaulInformation, recommendedFurniture,
 *   amazonOrderSummary
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Pipeline step tracking
  steps: defineTable({
    stepNum: v.number(),
    stepName: v.string(),
    currentCost: v.number(),
  }),

  // Async job status tracking
  jobs: defineTable({
    type: v.string(), // "search_rentals" | "order_uhaul" | "update_address" | "order_furniture"
    status: v.string(), // "pending" | "running" | "completed" | "failed"
    params: v.any(),
    result: v.optional(v.any()),
    errorMessage: v.optional(v.string()),
    // Browser Use task tracking (stored as strings — component-managed IDs)
    browserUseTaskId: v.optional(v.string()),
    browserUseExternalId: v.optional(v.string()),
  }).index("by_status", ["status"]),

  // User rental search preferences
  searchConstraints: defineTable({
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

  // GPT-4o house analysis results
  currentHouseInformation: defineTable({
    description: v.string(),
    estimatedBedrooms: v.number(),
    estimatedSquareFootage: v.number(),
    stuffVolumeEstimate: v.string(),
    recommendedTruckSize: v.string(),
    reasoning: v.string(),
    recommendedWorkers: v.number(),
    laborReasoning: v.string(),
  }),

  // Found rental listings from Redfin
  redfinApplications: defineTable({
    address: v.string(),
    monthlyRentPrice: v.number(),
    numBedrooms: v.number(),
    numBathrooms: v.number(),
    squareFootage: v.number(),
    moveInCost: v.number(),
    url: v.string(),
  }),

  // U-Haul reservation details
  uhaulInformation: defineTable({
    vehicle: v.string(),
    pickupLocation: v.string(),
    pickupTime: v.string(),
    dropOffLocation: v.string(),
    movingHelpProvider: v.string(),
    numWorkers: v.number(),
    numHours: v.number(),
    totalCost: v.number(),
  }),

  // AI-recommended furniture items
  recommendedFurniture: defineTable({
    itemName: v.string(),
    room: v.string(),
    amazonSearchQuery: v.string(),
    priority: v.string(), // "essential" | "nice-to-have"
  }),

  // Amazon order summaries
  amazonOrderSummary: defineTable({
    summary: v.string(),
  }),

  // House image for moving pipeline (stored in Convex file storage)
  houseImage: defineTable({
    storageId: v.id("_storage"),
  }),
});
