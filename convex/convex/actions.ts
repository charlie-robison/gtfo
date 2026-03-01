/**
 * Background actions that call FastAPI to run skills/agents,
 * then write results back to Convex DB.
 */
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

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

/** Check if a job has been cancelled; if so, return true so the handler can bail. */
async function isJobCancelled(
  ctx: { runQuery: (ref: any, args: any) => Promise<any> },
  jobId: any,
): Promise<boolean> {
  const job = await ctx.runQuery(api.queries.getJob, { jobId });
  return job?.status === "cancelled";
}

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
        body: JSON.stringify({ ...params, jobId, jobType: "search_rentals" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();
      const listings = result.listings ?? [];

      // Save each listing as a redfin_application with status "found"
      for (const listing of listings) {
        await ctx.runMutation(api.mutations.insertRedfinApplication, {
          name: listing.name ?? "",
          address: listing.address ?? "",
          city: listing.city ?? params.city ?? "",
          description: listing.description ?? "",
          imageUrl: listing.imageUrl ?? listing.image_url ?? "",
          monthlyRentPrice: listing.monthly_rent_price ?? listing.monthlyRentPrice ?? 0,
          numBedrooms: listing.num_bedrooms ?? listing.numBedrooms ?? 0,
          numBathrooms: listing.num_bathrooms ?? listing.numBathrooms ?? 0,
          squareFootage: listing.square_footage ?? listing.squareFootage ?? 0,
          moveInCost: listing.move_in_cost ?? listing.moveInCost ?? 0,
          url: listing.url ?? "",
          applicationStatus: "found",
        });
      }

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: { listingsCount: listings.length },
      });

      // Immediately schedule apply jobs for all found listings
      if (listings.length > 0) {
        const applyParams = {
          fullName: params.fullName,
          phone: params.phone,
          moveInDate: params.moveInDate,
        };
        const applyJobId = await ctx.runMutation(api.mutations.createJob, {
          type: "apply_to_listings",
          params: applyParams,
        });
        await ctx.scheduler.runAfter(0, api.actions.runApplyToListings, {
          jobId: applyJobId,
          params: applyParams,
        });
      }
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Apply to All Found Listings (in parallel) ──────────────────

export const runApplyToListings = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      // Get all listings with status "found"
      const foundListings = await ctx.runQuery(api.queries.listFoundRedfinApplications);

      if (foundListings.length === 0) {
        await ctx.runMutation(api.mutations.completeJob, {
          jobId,
          result: { message: "No found listings to apply to." },
        });
        return;
      }

      // Create and schedule an apply job for each listing in parallel
      for (const listing of foundListings) {
        if (!listing.url) continue;

        const applyParams = {
          listingUrl: listing.url,
          fullName: params.fullName,
          phone: params.phone,
          moveInDate: params.moveInDate,
          applicationId: listing._id,
        };

        const applyJobId = await ctx.runMutation(api.mutations.createJob, {
          type: "apply_redfin",
          params: applyParams,
        });

        // Link the apply job to the application and mark as "applying"
        await ctx.runMutation(api.mutations.updateRedfinApplicationStatus, {
          applicationId: listing._id,
          applicationStatus: "applying",
          applyJobId: applyJobId,
        });

        // Schedule the apply action in background (all run in parallel)
        await ctx.scheduler.runAfter(0, api.actions.runApplyRedfin, {
          jobId: applyJobId,
          params: applyParams,
        });
      }

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: { listingsCount: foundListings.length },
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Apply to Single Redfin Listing ─────────────────────────────

export const runApplyRedfin = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-apply-redfin`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ ...params, jobId, jobType: "apply_redfin" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update the redfin_application status to applied
      if (params.applicationId) {
        await ctx.runMutation(api.mutations.updateRedfinApplicationStatus, {
          applicationId: params.applicationId,
          applicationStatus: "applied",
        });
      }

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: result.message ?? "Applied to listing!",
      });
    } catch (e: any) {
      // Update the redfin_application status to failed
      if (params.applicationId) {
        await ctx.runMutation(api.mutations.updateRedfinApplicationStatus, {
          applicationId: params.applicationId,
          applicationStatus: "failed",
        });
      }

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
        body: JSON.stringify({ ...params, jobId, jobType: "order_uhaul" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const uhaulData = await resp.json();

      // Check if cancelled before persisting
      if (await isJobCancelled(ctx, jobId)) return;
      
      if (uhaulData.error) {
        throw new Error(`U-Haul order failed: ${uhaulData.error}`);
      }

      await ctx.runMutation(api.mutations.insertUhaulInformation, {
        vehicle: String(uhaulData.vehicle ?? ""),
        pickupLocation: String(uhaulData.pickupLocation ?? ""),
        pickupTime: String(uhaulData.pickupTime ?? ""),
        dropOffLocation: String(uhaulData.dropOffLocation ?? ""),
        movingHelpProvider: String(uhaulData.movingHelpProvider ?? ""),
        numWorkers: Number(uhaulData.numWorkers) || 0,
        numHours: Number(uhaulData.numHours) || 0,
        totalCost: Number(String(uhaulData.totalCost).replace(/[^0-9.]/g, "")) || 0,
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

// ── Update Amazon Address ───────────────────────────────────────

export const runUpdateAddress = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-update-amazon-address`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ ...params, jobId, jobType: "update_amazon_address" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      // Check if cancelled before persisting
      if (await isJobCancelled(ctx, jobId)) return;

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
        body: JSON.stringify({ items: params.items, jobId, jobType: "order_furniture" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Check if cancelled before persisting
      if (await isJobCancelled(ctx, jobId)) return;

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

// ── Update Cash App Address ─────────────────────────────────────

export const runUpdateCashappAddress = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-update-cashapp-address`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ ...params, jobId, jobType: "update_cashapp_address" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      // Check if cancelled before persisting
      if (await isJobCancelled(ctx, jobId)) return;

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: result.message ?? "Updated Cash App address!",
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Update Southwest Address ────────────────────────────────────

export const runUpdateSouthwestAddress = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-update-southwest-address`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ ...params, jobId, jobType: "update_southwest_address" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      // Check if cancelled before persisting
      if (await isJobCancelled(ctx, jobId)) return;

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: result.message ?? "Updated Southwest address!",
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Update DoorDash Address ─────────────────────────────────────

export const runUpdateDoordashAddress = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-update-doordash-address`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ ...params, jobId, jobType: "update_doordash_address" }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      // Check if cancelled before persisting
      if (await isJobCancelled(ctx, jobId)) return;

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: result.message ?? "Updated DoorDash address!",
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Determine Addresses (email scan + classification) ───────────

export const runDetermineAddresses = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-determine-addresses`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const services = result.services ?? [];

      for (const svc of services) {
        await ctx.runMutation(api.mutations.insertDetectedService, {
          serviceName: svc.service_name ?? "",
          category: svc.category ?? "other",
          priority: svc.priority ?? "low",
          detectedFrom: svc.detected_from ?? [],
          emailCount: svc.email_count ?? 0,
          settingsUrl: svc.settings_url ?? undefined,
          needsAddressUpdate: svc.needs_address_update ?? true,
          sampleSender: svc.sample_sender ?? "",
        });
      }

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: {
          services,
          userEmail: result.userEmail ?? "",
          totalScanned: result.totalScanned ?? 0,
        },
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});

// ── Cancel Current Lease ────────────────────────────────────────

export const runCancelLease = action({
  args: {
    jobId: v.id("jobs"),
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const { jobId, params } = args;

    await ctx.runMutation(api.mutations.updateJobStatus, { jobId, status: "running" });

    try {
      const resp = await fetch(`${getFastapiUrl()}/run-cancel-lease`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`FastAPI error ${resp.status}: ${text}`);
      }

      const result = await resp.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await ctx.runMutation(api.mutations.completeJob, {
        jobId,
        result: {
          message: result.message ?? "Lease cancellation sent",
          sentFrom: result.sentFrom ?? "",
        },
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
    jobId: v.id("jobs"),
    destinationAddress: v.string(),
    date: v.string(),
    pickupTime: v.string(),
    initialAddress: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.mutations.updateJobStatus, { jobId: args.jobId, status: "running" });

    try {
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

      await ctx.runMutation(api.mutations.completeJob, {
        jobId: args.jobId,
        result: { analysis, furnitureCount: furnitureItems.length, uhaulJobId },
      });
    } catch (e: any) {
      await ctx.runMutation(api.mutations.failJob, {
        jobId: args.jobId,
        errorMessage: e.message ?? String(e),
      });
    }
  },
});
