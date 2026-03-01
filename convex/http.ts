import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// ── Helpers ─────────────────────────────────────────────────────

function corsHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

// ── POST /search-rentals ────────────────────────────────────────

http.route({
  path: "/search-rentals",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const maxResults = 5;

    // Write search constraints to Convex
    await ctx.runMutation(api.mutations.insertSearchConstraints, {
      budget: body.budget,
      city: body.city,
      state: body.state,
      fullName: body.full_name,
      phone: body.phone,
      moveInDate: body.move_in_date,
      minBedrooms: body.min_bedrooms ?? 1,
      minBathrooms: body.min_bathrooms ?? 1,
      maxResults,
      initialAddress: body.initial_address ?? "",
    });

    // Write step to Convex
    await ctx.runMutation(api.mutations.insertStep, {
      stepNum: 0,
      stepName: "Apply to Listings",
      currentCost: 0,
    });

    // Create job in Convex
    const params = {
      city: body.city,
      state: body.state,
      maxRent: body.budget - 1000,
      fullName: body.full_name,
      phone: body.phone,
      moveInDate: body.move_in_date,
      minBedrooms: body.min_bedrooms ?? 1,
      minBathrooms: body.min_bathrooms ?? 1,
      maxResults,
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "search_rentals",
      params,
    });

    // Schedule background action
    await ctx.scheduler.runAfter(0, api.actions.runSearchRentals, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/search-rentals",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /moving-pipeline ───────────────────────────────────────

http.route({
  path: "/moving-pipeline",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // Get initial address from latest search constraints
    const constraints = await ctx.runMutation(api.mutations.getLatestSearchConstraints, {});
    const initialAddress = constraints?.initialAddress ?? "";

    // Run the analysis action (calls FastAPI, writes to Convex)
    const result = await ctx.runAction(api.actions.runMovingAnalysis, {
      destinationAddress: body.destination_address,
      date: body.date,
      pickupTime: body.pickup_time ?? "10:00 AM",
      initialAddress,
    });

    return jsonResponse(result);
  }),
});

http.route({
  path: "/moving-pipeline",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /update-address ────────────────────────────────────────

http.route({
  path: "/update-address",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      fullName: body.full_name,
      streetAddress: body.street_address,
      city: body.city,
      state: body.state,
      zipCode: body.zip_code,
      phone: body.phone ?? "",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "update_address",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runUpdateAddress, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/update-address",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /order-furniture ───────────────────────────────────────

http.route({
  path: "/order-furniture",
  method: "POST",
  handler: httpAction(async (ctx) => {
    // Read furniture from Convex DB
    const furniture = await ctx.runQuery(api.queries.listRecommendedFurniture);
    const searchQueries = furniture.map((f: any) => f.amazonSearchQuery);

    if (searchQueries.length === 0) {
      return jsonResponse(
        { error: "No recommended furniture found. Run /moving-pipeline first." },
        400,
      );
    }

    const params = { items: searchQueries };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "order_furniture",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runOrderFurniture, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/order-furniture",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /cancel-current-lease (TODO) ───────────────────────────

http.route({
  path: "/cancel-current-lease",
  method: "POST",
  handler: httpAction(async () => jsonResponse(null)),
});

http.route({
  path: "/cancel-current-lease",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /determine-addresses (TODO) ────────────────────────────

http.route({
  path: "/determine-addresses",
  method: "POST",
  handler: httpAction(async () => jsonResponse(null)),
});

http.route({
  path: "/determine-addresses",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /setup-utilities (TODO) ────────────────────────────────

http.route({
  path: "/setup-utilities",
  method: "POST",
  handler: httpAction(async () => jsonResponse(null)),
});

http.route({
  path: "/setup-utilities",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /jobs ───────────────────────────────────────────────────

http.route({
  path: "/jobs",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("job_id");
    if (jobId) {
      const job = await ctx.runQuery(api.queries.getJob, { jobId: jobId as any });
      if (!job) {
        return jsonResponse({ error: "Job not found" }, 404);
      }
      return jsonResponse(job);
    }
    const jobs = await ctx.runQuery(api.queries.listJobs);
    return jsonResponse(jobs);
  }),
});

http.route({
  path: "/jobs",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /steps ──────────────────────────────────────────────────

http.route({
  path: "/steps",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listSteps);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/steps",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /search-constraints ─────────────────────────────────────

http.route({
  path: "/search-constraints",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listSearchConstraints);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/search-constraints",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /house-information ──────────────────────────────────────

http.route({
  path: "/house-information",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listHouseInformation);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/house-information",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /redfin-applications ────────────────────────────────────

http.route({
  path: "/redfin-applications",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listRedfinApplications);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/redfin-applications",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /uhaul-information ──────────────────────────────────────

http.route({
  path: "/uhaul-information",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listUhaulInformation);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/uhaul-information",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /recommended-furniture ──────────────────────────────────

http.route({
  path: "/recommended-furniture",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listRecommendedFurniture);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/recommended-furniture",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /screenshots/upload ─────────────────────────────────────

http.route({
  path: "/screenshots/upload",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { jobId, jobType, stepNumber, pageUrl, pageTitle, screenshotBase64 } = body;

    if (!jobId || !screenshotBase64) {
      return jsonResponse({ error: "jobId and screenshotBase64 are required" }, 400);
    }

    const binary = Uint8Array.from(atob(screenshotBase64), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([binary], { type: "image/png" });
    const storageId = await ctx.storage.store(blob);

    await ctx.runMutation(api.mutations.insertScreenshot, {
      jobId,
      jobType: jobType ?? "",
      stepNumber: stepNumber ?? 0,
      pageUrl: pageUrl ?? "",
      pageTitle: pageTitle ?? "",
      storageId,
    });

    return jsonResponse({ ok: true, storageId });
  }),
});

http.route({
  path: "/screenshots/upload",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /screenshots ────────────────────────────────────────────

http.route({
  path: "/screenshots",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const jobType = url.searchParams.get("job_type");
    const jobId = url.searchParams.get("job_id");

    if (jobId) {
      const data = await ctx.runQuery(api.queries.listScreenshotsByJobId, {
        jobId: jobId as any,
      });
      return jsonResponse(data);
    }

    if (jobType) {
      const data = await ctx.runQuery(api.queries.listScreenshotsByJobType, {
        jobType,
      });
      return jsonResponse(data);
    }

    return jsonResponse(
      { error: "Provide ?job_type= or ?job_id= query parameter" },
      400,
    );
  }),
});

http.route({
  path: "/screenshots",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── GET /amazon-order-summary ───────────────────────────────────

http.route({
  path: "/amazon-order-summary",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listAmazonOrderSummary);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/amazon-order-summary",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

export default http;
