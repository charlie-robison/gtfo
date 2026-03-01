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
    const maxResults = body.max_results ?? 5;

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
      stepName: "Search Listings",
      currentCost: 0,
    });

    // Create job in Convex — search phase
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

    // Schedule background action (search → save listings to DB)
    await ctx.scheduler.runAfter(0, api.actions.runSearchRentals, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/search-rentals",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /apply-to-listings ─────────────────────────────────────

http.route({
  path: "/apply-to-listings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // Get user info from request body or fall back to latest search constraints
    let fullName = body.full_name ?? "";
    let phone = body.phone ?? "";
    let moveInDate = body.move_in_date ?? "";

    if (!fullName || !phone || !moveInDate) {
      const constraints = await ctx.runMutation(api.mutations.getLatestSearchConstraints, {});
      if (constraints) {
        fullName = fullName || constraints.fullName;
        phone = phone || constraints.phone;
        moveInDate = moveInDate || constraints.moveInDate;
      }
    }

    const params = { fullName, phone, moveInDate };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "apply_to_listings",
      params,
    });

    // Schedule background action to create apply jobs for each found listing
    await ctx.scheduler.runAfter(0, api.actions.runApplyToListings, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/apply-to-listings",
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

// ── POST /update-amazon-address ─────────────────────────────────

http.route({
  path: "/update-amazon-address",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      fullName: body.full_name ?? body.fullName ?? "",
      streetAddress: body.street_address ?? body.streetAddress ?? "",
      city: body.city ?? "",
      state: body.state ?? "",
      zipCode: body.zip_code ?? body.zipCode ?? "",
      phone: body.phone ?? "",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "update_amazon_address",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runUpdateAddress, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/update-amazon-address",
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

// ── POST /update-cashapp-address ────────────────────────────────

http.route({
  path: "/update-cashapp-address",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      streetAddress: body.street_address ?? body.streetAddress ?? "",
      city: body.city ?? "",
      state: body.state ?? "",
      zipCode: body.zip_code ?? body.zipCode ?? "",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "update_cashapp_address",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runUpdateCashappAddress, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/update-cashapp-address",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /update-southwest-address ─────────────────────────────

http.route({
  path: "/update-southwest-address",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      streetAddress: body.street_address ?? body.streetAddress ?? "",
      city: body.city ?? "",
      state: body.state ?? "",
      zipCode: body.zip_code ?? body.zipCode ?? "",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "update_southwest_address",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runUpdateSouthwestAddress, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/update-southwest-address",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /update-doordash-address ──────────────────────────────

http.route({
  path: "/update-doordash-address",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      streetAddress: body.street_address ?? body.streetAddress ?? "",
      city: body.city ?? "",
      state: body.state ?? "",
      zipCode: body.zip_code ?? body.zipCode ?? "",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "update_doordash_address",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runUpdateDoordashAddress, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/update-doordash-address",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /cancel-job ─────────────────────────────────────────────

http.route({
  path: "/cancel-job",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const jobId = body.job_id;

    if (!jobId) {
      return jsonResponse({ error: "job_id is required" }, 400);
    }

    await ctx.runMutation(api.mutations.cancelJob, { jobId });

    return jsonResponse({ ok: true });
  }),
});

http.route({
  path: "/cancel-job",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /cancel-current-lease ───────────────────────────────────

http.route({
  path: "/cancel-current-lease",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      landlordEmail: body.landlord_email,
      tenantName: body.tenant_name,
      currentAddress: body.current_address,
      leaseEndDate: body.lease_end_date,
      moveOutDate: body.move_out_date,
      reason: body.reason ?? "I am relocating.",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "cancel_lease",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runCancelLease, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
});

http.route({
  path: "/cancel-current-lease",
  method: "OPTIONS",
  handler: httpAction(async () => corsPreflightResponse()),
});

// ── POST /determine-addresses ────────────────────────────────────

http.route({
  path: "/determine-addresses",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    const params = {
      oldStreet: body.old_street ?? "",
      oldCity: body.old_city ?? "",
      oldState: body.old_state ?? "",
      oldZipCode: body.old_zip_code ?? "",
    };

    const jobId = await ctx.runMutation(api.mutations.createJob, {
      type: "determine_addresses",
      params,
    });

    await ctx.scheduler.runAfter(0, api.actions.runDetermineAddresses, { jobId, params });

    return jsonResponse({ job_id: jobId });
  }),
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

// ── GET /detected-services ─────────────────────────────────────

http.route({
  path: "/detected-services",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const data = await ctx.runQuery(api.queries.listDetectedServices);
    return jsonResponse(data);
  }),
});

http.route({
  path: "/detected-services",
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
