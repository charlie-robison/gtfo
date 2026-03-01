/**
 * Background actions that call FastAPI to run skills/agents,
 * then write results back to Convex DB.
 */
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

async function storeScreenshots(
  ctx: any,
  screenshots: any[],
  jobId: Id<"jobs">,
  jobType: string,
) {
  for (const s of screenshots) {
    const binary = Uint8Array.from(atob(s.screenshotBase64), (c) =>
      c.charCodeAt(0),
    );
    const blob = new Blob([binary], { type: "image/png" });
    const storageId = await ctx.storage.store(blob);
    await ctx.runMutation(api.mutations.insertScreenshot, {
      jobId,
      jobType,
      stepNumber: s.stepNumber ?? 0,
      pageUrl: s.pageUrl ?? "",
      pageTitle: s.pageTitle ?? "",
      storageId,
    });
  }
}

function getFastapiUrl(): string {
  const url = process.env.FASTAPI_URL;
  if (!url) {
    throw new Error("FASTAPI_URL environment variable is not set.");
  }
  return url;
}

const fetchHeaders = {
  "Content-Type": "application/json",
  "User-Agent": "convex-backend",
  "ngrok-skip-browser-warning": "69420",
};

// ── Search Rentals ──────────────────────────────────────────────

export const runSearchRentals = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-search-rentals`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();
      const listings = result.listings ?? [];

      for (const listing of listings) {
        await ctx.runMutation(api.mutations.insertRedfinApplication, {
          address: listing.address ?? "",
          monthlyRentPrice: listing.monthlyRentPrice ?? 0,
          numBedrooms: listing.numBedrooms ?? 0,
          numBathrooms: listing.numBathrooms ?? 0,
          squareFootage: listing.squareFootage ?? 0,
          moveInCost: listing.moveInCost ?? 0,
          url: listing.url ?? "",
        });
      }

      await storeScreenshots(ctx, result.screenshots ?? [], jobId, "search_rentals");

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: { listingsCount: listings.length },
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Order U-Haul ────────────────────────────────────────────────

export const runOrderUhaul = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-order-uhaul`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const uhaulData = await resp.json();

      await storeScreenshots(ctx, uhaulData.screenshots ?? [], jobId, "order_uhaul");

      await ctx.runMutation(api.mutations.insertUhaulInformation, {
        vehicle: uhaulData.vehicle ?? "",
        pickupLocation: uhaulData.pickupLocation ?? "",
        pickupTime: uhaulData.pickupTime ?? "",
        dropOffLocation: uhaulData.dropOffLocation ?? "",
        movingHelpProvider: uhaulData.movingHelpProvider ?? "",
        numWorkers: uhaulData.numWorkers ?? 0,
        numHours: uhaulData.numHours ?? 0,
        totalCost: uhaulData.totalCost ?? 0,
      });

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: uhaulData,
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Update Address ──────────────────────────────────────────────

export const runUpdateAddress = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-update-address`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      await storeScreenshots(ctx, result.screenshots ?? [], jobId, "update_address");

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: result.message ?? "Updated all addresses to new address!",
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Order Furniture ─────────────────────────────────────────────

export const runOrderFurniture = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-order-furniture`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ items: params.items }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      await storeScreenshots(ctx, result.screenshots ?? [], jobId, "order_furniture");

      await ctx.runMutation(api.mutations.insertAmazonOrderSummary, {
        summary: result.summary ?? "",
      });

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: { summary: result.summary ?? "" },
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Moving Pipeline (house analysis + furniture recs) ───────────

export const runMovingAnalysis = action({
  args: {
    destinationAddress: v.string(),
    date: v.string(),
    pickupTime: v.string(),
    initialAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Call FastAPI for house analysis + furniture recs
    const resp = await fetch(`${getFastapiUrl()}/run-moving-analysis`, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify({
        destination_address: args.destinationAddress,
        date: args.date,
        pickup_time: args.pickupTime,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`FastAPI error ${resp.status}: ${text}`);
    }

    const result = await resp.json();
    const analysis = result.analysis;
    const furnitureItems = result.furniture;

    // Write house analysis to Convex
    await ctx.runMutation(api.mutations.insertHouseInformation, {
      description: analysis.house_description ?? "",
      estimatedBedrooms: analysis.estimated_bedrooms ?? 0,
      estimatedSquareFootage: analysis.estimated_square_footage ?? 0,
      stuffVolumeEstimate: analysis.stuff_volume_estimate ?? "",
      recommendedTruckSize: analysis.recommended_truck_size ?? "",
      reasoning: analysis.reasoning ?? "",
      recommendedWorkers: analysis.recommended_workers ?? 0,
      laborReasoning: analysis.labor_reasoning ?? "",
    });

    // Write furniture items to Convex
    for (const item of furnitureItems) {
      await ctx.runMutation(api.mutations.insertRecommendedFurniture, {
        itemName: item.item_name ?? "",
        room: item.room ?? "",
        amazonSearchQuery: item.amazon_search_query ?? "",
        priority: item.priority ?? "essential",
      });
    }

    // Create U-Haul background job
    const uhaulParams = {
      pickupLocation: args.initialAddress,
      dropoffLocation: args.destinationAddress,
      pickupDate: args.date,
      pickupTime: args.pickupTime,
      vehicleType: analysis.recommended_truck_size ?? "15' Truck",
      numWorkers: analysis.recommended_workers ?? 2,
      loadingAddress: args.initialAddress,
    };

    const uhaulJobId = await ctx.runMutation(api.mutations.createJob, {
      type: "order_uhaul",
      params: uhaulParams,
    });

    // Schedule U-Haul ordering in background
    await ctx.scheduler.runAfter(0, api.actions.runOrderUhaul, {
      jobId: uhaulJobId,
      params: uhaulParams,
    });

    return {
      analysis,
      furniture: furnitureItems,
      uhaulJobId,
    };
  },
});
