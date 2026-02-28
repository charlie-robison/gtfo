/**
 * HTTP Actions — Convex HTTP router.
 *
 * Exposes REST endpoints at https://<deployment>.convex.site
 * Mirrors the original FastAPI endpoints:
 *
 *   POST /search-rentals      — Search & apply to Redfin rentals
 *   POST /moving-pipeline     — House analysis + furniture + U-Haul
 *   POST /update-address      — Update Amazon delivery address
 *   POST /order-furniture     — Order recommended furniture on Amazon
 *   GET  /jobs/:job_id        — Check job status
 *   GET  /steps               — List pipeline steps
 *   GET  /search-constraints  — List search constraints
 *   GET  /house-information   — List house analyses
 *   GET  /redfin-applications — List rental listings
 *   GET  /uhaul-information   — List U-Haul reservations
 *   GET  /recommended-furniture — List furniture recommendations
 *   GET  /amazon-order-summary  — List order summaries
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server.js";
import { internal, api } from "./_generated/api.js";
import { Id } from "./_generated/dataModel.js";

const http = httpRouter();

// ── CORS helpers ────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ── CORS preflight handler ──────────────────────────────────────

const corsPreflightHandler = httpAction(async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
});

// Register OPTIONS for all POST routes
for (const path of [
  "/search-rentals",
  "/moving-pipeline",
  "/update-address",
  "/order-furniture",
  "/upload-house-image",
]) {
  http.route({ path, method: "OPTIONS", handler: corsPreflightHandler });
}

// ── POST /upload-house-image ─────────────────────────────────────

http.route({
  path: "/upload-house-image",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const blob = await request.blob();
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(internal.data.saveHouseImage, { storageId });
    return jsonResponse({ storageId, message: "House image uploaded successfully" });
  }),
});

// ── POST /search-rentals ────────────────────────────────────────

http.route({
  path: "/search-rentals",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const {
      budget,
      city,
      state,
      full_name,
      phone,
      move_in_date,
      min_bedrooms,
      min_bathrooms,
      initial_address,
    } = body;

    if (!budget || !city || !state || !full_name || !phone || !move_in_date) {
      return errorResponse(
        "Missing required fields: budget, city, state, full_name, phone, move_in_date"
      );
    }

    const result = await ctx.runAction(internal.searchRentals.kickoff, {
      budget,
      city,
      state,
      fullName: full_name,
      phone,
      moveInDate: move_in_date,
      minBedrooms: min_bedrooms,
      minBathrooms: min_bathrooms,
      initialAddress: initial_address,
    });

    return jsonResponse(result);
  }),
});

// ── POST /moving-pipeline ───────────────────────────────────────

http.route({
  path: "/moving-pipeline",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const { destination_address, date, pickup_time } = body;

    if (!destination_address || !date) {
      return errorResponse(
        "Missing required fields: destination_address, date"
      );
    }

    const result = await ctx.runAction(internal.movingPipeline.kickoff, {
      destinationAddress: destination_address,
      date,
      pickupTime: pickup_time,
    });

    return jsonResponse(result);
  }),
});

// ── POST /update-address ────────────────────────────────────────

http.route({
  path: "/update-address",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const { full_name, street_address, city, state, zip_code, phone } = body;

    if (!full_name || !street_address || !city || !state || !zip_code) {
      return errorResponse(
        "Missing required fields: full_name, street_address, city, state, zip_code"
      );
    }

    const result = await ctx.runAction(internal.updateAddress.kickoff, {
      fullName: full_name,
      streetAddress: street_address,
      city,
      state,
      zipCode: zip_code,
      phone,
    });

    return jsonResponse(result);
  }),
});

// ── POST /order-furniture ───────────────────────────────────────

http.route({
  path: "/order-furniture",
  method: "POST",
  handler: httpAction(async (ctx) => {
    const result = await ctx.runAction(internal.orderFurniture.kickoff, {});
    return jsonResponse(result);
  }),
});

// ── GET /jobs/:job_id ───────────────────────────────────────────

http.route({
  pathPrefix: "/jobs/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const jobId = url.pathname.replace("/jobs/", "") as Id<"jobs">;

    if (!jobId) {
      return errorResponse("Missing job_id in path", 400);
    }

    const job = await ctx.runQuery(api.jobs.get, { jobId });

    if (!job) {
      return errorResponse("Job not found", 404);
    }

    return jsonResponse(job);
  }),
});

// ── GET /steps ──────────────────────────────────────────────────

http.route({
  path: "/steps",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listSteps, {});
    return jsonResponse(docs);
  }),
});

// ── GET /search-constraints ─────────────────────────────────────

http.route({
  path: "/search-constraints",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listSearchConstraints, {});
    return jsonResponse(docs);
  }),
});

// ── GET /house-information ──────────────────────────────────────

http.route({
  path: "/house-information",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listHouseInformation, {});
    return jsonResponse(docs);
  }),
});

// ── GET /redfin-applications ────────────────────────────────────

http.route({
  path: "/redfin-applications",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listRedfinApplications, {});
    return jsonResponse(docs);
  }),
});

// ── GET /uhaul-information ──────────────────────────────────────

http.route({
  path: "/uhaul-information",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listUhaulInformation, {});
    return jsonResponse(docs);
  }),
});

// ── GET /recommended-furniture ──────────────────────────────────

http.route({
  path: "/recommended-furniture",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listRecommendedFurniture, {});
    return jsonResponse(docs);
  }),
});

// ── GET /amazon-order-summary ───────────────────────────────────

http.route({
  path: "/amazon-order-summary",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const docs = await ctx.runQuery(api.data.listAmazonOrderSummary, {});
    return jsonResponse(docs);
  }),
});

export default http;
