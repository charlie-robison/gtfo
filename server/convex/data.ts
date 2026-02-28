/**
 * Generic read queries and helper mutations for all collections.
 *
 * Replaces the GET endpoints from the original FastAPI server:
 *   GET /steps, /search-constraints, /house-information,
 *   /redfin-applications, /uhaul-information,
 *   /recommended-furniture, /amazon-order-summary
 */

import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server.js";

// ── Steps ───────────────────────────────────────────────────────

export const listSteps = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("steps").collect();
  },
});

export const insertStep = mutation({
  args: {
    stepNum: v.number(),
    stepName: v.string(),
    currentCost: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("steps", args);
  },
});

// ── Search Constraints ──────────────────────────────────────────

export const listSearchConstraints = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("searchConstraints").collect();
  },
});

// ── House Information ───────────────────────────────────────────

export const listHouseInformation = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("currentHouseInformation").collect();
  },
});

// ── Redfin Applications ─────────────────────────────────────────

export const listRedfinApplications = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("redfinApplications").collect();
  },
});

// ── U-Haul Information ──────────────────────────────────────────

export const listUhaulInformation = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("uhaulInformation").collect();
  },
});

// ── Recommended Furniture ───────────────────────────────────────

export const listRecommendedFurniture = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("recommendedFurniture").collect();
  },
});

// ── Amazon Order Summary ────────────────────────────────────────

export const listAmazonOrderSummary = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("amazonOrderSummary").collect();
  },
});

// ── House Image (Convex File Storage) ──────────────────────────

export const saveHouseImage = internalMutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    // Delete any existing house image entries
    const existing = await ctx.db.query("houseImage").collect();
    for (const doc of existing) {
      await ctx.storage.delete(doc.storageId);
      await ctx.db.delete(doc._id);
    }
    return ctx.db.insert("houseImage", { storageId });
  },
});

export const getHouseImageUrl = internalQuery({
  args: {},
  handler: async (ctx) => {
    const doc = await ctx.db.query("houseImage").first();
    if (!doc) return null;
    return ctx.storage.getUrl(doc.storageId);
  },
});
