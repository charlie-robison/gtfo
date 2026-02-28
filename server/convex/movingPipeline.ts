/**
 * Moving Pipeline — kickoff action, background worker, mutations, and queries.
 *
 * The HTTP handler calls `kickoff` which does GPT-4o analysis synchronously
 * (fast) then schedules the long-running U-Haul browser task in `worker`.
 */

import { v } from "convex/values";
import { internalAction, query, internalMutation } from "./_generated/server.js";
import { internal, api } from "./_generated/api.js";
import { browserUse } from "./browserUse.js";
import {
  VALID_TRUCK_SIZES,
  buildHouseAnalysisPrompt,
  buildFurnitureRecommendationPrompt,
  buildUhaulOrderTask,
} from "./lib/prompts.js";
import {
  analyzeHousePhoto,
  recommendFurniture,
  parseUhaulResult,
  type FurnitureItemResult,
} from "./lib/openai.js";

// ── Queries ─────────────────────────────────────────────────────

export const listHouseInformation = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("currentHouseInformation").collect();
  },
});

export const listRecommendedFurniture = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("recommendedFurniture").collect();
  },
});

export const listUhaulInformation = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("uhaulInformation").collect();
  },
});

// ── Internal Mutations ──────────────────────────────────────────

export const insertHouseInfo = internalMutation({
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
    return ctx.db.insert("currentHouseInformation", args);
  },
});

export const insertFurnitureItem = internalMutation({
  args: {
    itemName: v.string(),
    room: v.string(),
    amazonSearchQuery: v.string(),
    priority: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("recommendedFurniture", args);
  },
});

export const insertUhaulInfo = internalMutation({
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
    return ctx.db.insert("uhaulInformation", args);
  },
});

// ── Kickoff (called by HTTP handler — does GPT-4o then returns) ─

export const kickoff = internalAction({
  args: {
    destinationAddress: v.string(),
    date: v.string(),
    pickupTime: v.optional(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const pickupTime = args.pickupTime ?? "10:00 AM";

    // ── Step 0: Fetch house image from Convex file storage ───────
    const imageUrl: string | null = await ctx.runQuery(
      internal.data.getHouseImageUrl,
      {}
    );
    if (!imageUrl) {
      return { error: "No house image uploaded. POST /upload-house-image first." };
    }
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(imageBuffer);
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)));
    }
    const houseImageBase64 = `data:image/jpeg;base64,${btoa(chunks.join(""))}`;

    // ── Step 1: House photo analysis (GPT-4o vision) ─────────────
    const housePrompt = buildHouseAnalysisPrompt();
    const analysisData = await analyzeHousePhoto(
      houseImageBase64,
      housePrompt
    );

    let recommendedTruckSize = analysisData.recommended_truck_size;
    if (!VALID_TRUCK_SIZES.includes(recommendedTruckSize)) {
      const match = VALID_TRUCK_SIZES.find((s) =>
        recommendedTruckSize.toLowerCase().includes(s.toLowerCase())
      );
      recommendedTruckSize = match ?? "15' Truck";
    }

    await ctx.runMutation(internal.movingPipeline.insertHouseInfo, {
      description: analysisData.house_description,
      estimatedBedrooms: analysisData.estimated_bedrooms,
      estimatedSquareFootage: analysisData.estimated_square_footage,
      stuffVolumeEstimate: analysisData.stuff_volume_estimate,
      recommendedTruckSize,
      reasoning: analysisData.reasoning,
      recommendedWorkers: analysisData.recommended_workers,
      laborReasoning: analysisData.labor_reasoning,
    });

    // ── Step 2: Furniture recommendations (GPT-4o vision) ────────
    const furniturePrompt = buildFurnitureRecommendationPrompt({
      estimatedBedrooms: analysisData.estimated_bedrooms,
      estimatedSquareFootage: analysisData.estimated_square_footage,
      description: analysisData.house_description,
    });

    const furnitureData = await recommendFurniture(
      houseImageBase64,
      furniturePrompt
    );

    const furnitureItems: FurnitureItemResult[] = [];
    for (const item of furnitureData.items) {
      await ctx.runMutation(internal.movingPipeline.insertFurnitureItem, {
        itemName: item.item_name,
        room: item.room,
        amazonSearchQuery: item.amazon_search_query,
        priority: item.priority,
      });
      furnitureItems.push(item);
    }

    // ── Step 3: Schedule U-Haul browser task (background) ────────
    const constraints: Array<{ initialAddress: string }> = await ctx.runQuery(
      api.searchRentals.listConstraints,
      {}
    );
    const latestConstraints = constraints[constraints.length - 1];
    const initialAddress: string = latestConstraints?.initialAddress ?? "";

    const uhaulParams = {
      pickupLocation: initialAddress,
      dropoffLocation: args.destinationAddress,
      pickupDate: args.date,
      pickupTime,
      vehicleType: recommendedTruckSize,
      numWorkers: analysisData.recommended_workers,
      loadingAddress: initialAddress,
    };

    const jobId = await ctx.runMutation(api.jobs.create, {
      type: "order_uhaul",
      params: uhaulParams,
    });

    // Schedule background worker
    await ctx.scheduler.runAfter(0, internal.movingPipeline.worker, {
      jobId,
      ...uhaulParams,
    });

    return {
      analysis: {
        houseDescription: analysisData.house_description,
        estimatedBedrooms: analysisData.estimated_bedrooms,
        estimatedSquareFootage: analysisData.estimated_square_footage,
        stuffVolumeEstimate: analysisData.stuff_volume_estimate,
        recommendedTruckSize,
        reasoning: analysisData.reasoning,
        recommendedWorkers: analysisData.recommended_workers,
        laborReasoning: analysisData.labor_reasoning,
      },
      furniture: furnitureItems,
      uhaul_job_id: jobId,
    };
  },
});

// ── Background Worker (long-running U-Haul browser task) ────────

export const worker = internalAction({
  args: {
    jobId: v.id("jobs"),
    pickupLocation: v.string(),
    dropoffLocation: v.string(),
    pickupDate: v.string(),
    pickupTime: v.string(),
    vehicleType: v.string(),
    numWorkers: v.number(),
    loadingAddress: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const uhaulTaskPrompt = buildUhaulOrderTask(args);

    try {
      // ── Create a persistent browser profile + session with US proxy ──
      // This reduces CAPTCHA frequency (residential proxy IP) and persists
      // login cookies across runs so subsequent tasks skip the CAPTCHA.
      const UHAUL_PROFILE_NAME = "uhaul-profile";
      let profileId: string | undefined;

      try {
        const profiles = await browserUse.listProfiles(ctx);
        const existing = (profiles as Array<{ id: string; name: string }>).find(
          (p) => p.name === UHAUL_PROFILE_NAME
        );
        if (existing) {
          profileId = existing.id;
        } else {
          const newProfile = await browserUse.createProfile(ctx, {
            name: UHAUL_PROFILE_NAME,
          });
          profileId = (newProfile as { id: string }).id;
        }
      } catch {
        // If profile management fails, proceed without one
        console.warn("Could not manage browser profile, continuing without one");
      }

      const session = await browserUse.createSession(ctx, {
        ...(profileId ? { profileId } : {}),
        proxyCountryCode: "us",
        browserScreenWidth: 1440,
        browserScreenHeight: 900,
      });

      const taskResult = await browserUse.createTask(ctx, {
        task: uhaulTaskPrompt,
        startUrl: "https://www.uhaul.com",
        sessionId: session.externalId,
        maxSteps: 150,
        vision: true,
        thinking: true,
        highlightElements: true,
        systemPromptExtension:
          "You are controlling a real browser to complete a U-Haul reservation. " +
          "CRITICAL RULES: " +
          "1) You MUST act like a real human — never rush, never skip waits. " +
          "2) When typing into form fields, type slowly one character at a time (~150ms between keys). NEVER paste text. " +
          "3) Move the mouse to elements before clicking — use natural, slightly curved paths. " +
          "4) If you encounter ANY CAPTCHA, you MUST solve it using your vision. Do not skip or ignore CAPTCHAs. " +
          "5) For image-grid CAPTCHAs, examine each tile individually. Accuracy > speed. " +
          "6) After solving a CAPTCHA, wait 3 seconds before taking the next action. " +
          "7) For secrets (x_uhaul_email, x_uhaul_pass), type them character by character — do NOT use clipboard paste.",
        secrets: {
          x_uhaul_email: process.env.UHAUL_EMAIL ?? process.env.AMAZON_EMAIL ?? "",
          x_uhaul_pass: process.env.UHAUL_PASSWORD ?? process.env.AMAZON_PASSWORD ?? "",
        },
        allowedDomains: ["uhaul.com", "www.uhaul.com", "mail.google.com"],
      });

      await ctx.runMutation(api.jobs.setRunning, {
        jobId: args.jobId,
        browserUseTaskId: taskResult.taskId,
        browserUseExternalId: taskResult.externalId,
      });

      let taskStatus = await browserUse.fetchTaskStatus(ctx, {
        externalId: taskResult.externalId,
      });

      while (
        taskStatus.status !== "completed" &&
        taskStatus.status !== "failed"
      ) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        taskStatus = await browserUse.fetchTaskStatus(ctx, {
          externalId: taskResult.externalId,
        });
      }

      if (taskStatus.status === "completed") {
        const taskDetail = await browserUse.fetchTaskDetail(ctx, {
          externalId: taskResult.externalId,
        });
        const agentOutput = taskDetail.output ?? "";
        const uhaulData = await parseUhaulResult(agentOutput);

        await ctx.runMutation(internal.movingPipeline.insertUhaulInfo, {
          vehicle: uhaulData.vehicle ?? "",
          pickupLocation: uhaulData.pickupLocation ?? "",
          pickupTime: uhaulData.pickupTime ?? "",
          dropOffLocation: uhaulData.dropOffLocation ?? "",
          movingHelpProvider: uhaulData.movingHelpProvider ?? "",
          numWorkers: uhaulData.numWorkers ?? 0,
          numHours: uhaulData.numHours ?? 0,
          totalCost: uhaulData.totalCost ?? 0,
        });

        await ctx.runMutation(api.jobs.complete, {
          jobId: args.jobId,
          result: uhaulData,
        });
      } else {
        await ctx.runMutation(api.jobs.fail, {
          jobId: args.jobId,
          errorMessage: "Browser Use task failed",
        });
      }
    } catch (error: any) {
      await ctx.runMutation(api.jobs.fail, {
        jobId: args.jobId,
        errorMessage: `${error.name}: ${error.message}`,
      });
    }

    return null;
  },
});
