"use client";

import { useState, useEffect, useCallback } from "react";
import { getJobs, type Job } from "@/lib/endpoints";
import type { PhaseProgress } from "@/types";

// ── Job type sets per phase ─────────────────────────────────────
const PHASE_2_TYPES = new Set(["moving_analysis", "order_uhaul"]);

/** Weight each job status for the generic progress calc (Phase 2). */
function jobWeight(status: string): number {
  switch (status) {
    case "completed":
      return 1;
    case "running":
      return 0.5;
    case "pending":
      return 0.1;
    case "failed":
      return 0.5;
    default:
      return 0;
  }
}

// ── Phase 1: Find Apartment ─────────────────────────────────────
// search_rentals  → 0-50 %
// apply_to_listings + apply_redfin → 50-100 %
function computePhase1(allJobs: Job[]): PhaseProgress {
  const name = "Find Apartment";
  const searchJobs = allJobs.filter(
    (j) => j.type === "search_rentals" && j.status !== "cancelled"
  );
  const applyOrchestratorJobs = allJobs.filter(
    (j) => j.type === "apply_to_listings" && j.status !== "cancelled"
  );
  const applyJobs = allJobs.filter(
    (j) => j.type === "apply_redfin" && j.status !== "cancelled"
  );

  // Nothing started yet
  if (searchJobs.length === 0) {
    return { phase: 1, name, progress: 0, status: "pending" };
  }

  // ── Search half (0-50%) ───────────────────────────────────────
  const searchDone = searchJobs.every((j) => j.status === "completed");
  const searchRunning = searchJobs.some(
    (j) => j.status === "running" || j.status === "pending"
  );

  let searchProgress: number;
  if (searchDone) {
    searchProgress = 50;
  } else if (searchRunning) {
    // Show some intermediate progress while searching
    const hasRunning = searchJobs.some((j) => j.status === "running");
    searchProgress = hasRunning ? 25 : 5;
  } else {
    // failed
    searchProgress = 25;
  }

  // ── Apply half (50-100%) ──────────────────────────────────────
  let applyProgress = 0;

  // Count individual apply_redfin jobs for granular progress
  if (applyJobs.length > 0) {
    const completed = applyJobs.filter(
      (j) => j.status === "completed" || j.status === "failed"
    ).length;
    applyProgress = Math.round((completed / applyJobs.length) * 50);
  } else if (applyOrchestratorJobs.length > 0) {
    // Orchestrator exists but no individual apply jobs yet
    const orchRunning = applyOrchestratorJobs.some(
      (j) => j.status === "running" || j.status === "pending"
    );
    applyProgress = orchRunning ? 5 : 0;
  }

  const progress = Math.min(searchProgress + applyProgress, 100);

  // Status
  const allApplyCompleted =
    applyJobs.length > 0 &&
    applyJobs.every((j) => j.status === "completed");

  let status: PhaseProgress["status"];
  if (searchDone && allApplyCompleted) {
    status = "completed";
  } else if (searchJobs.length > 0) {
    status = "active";
  } else {
    status = "pending";
  }

  return { phase: 1, name, progress, status };
}

// ── Phase 2: Book Movers (generic weighted calc) ────────────────
function computePhase2(allJobs: Job[]): PhaseProgress {
  const name = "Book Movers";
  const jobs = allJobs.filter(
    (j) => PHASE_2_TYPES.has(j.type) && j.status !== "cancelled"
  );

  if (jobs.length === 0) {
    return { phase: 2, name, progress: 0, status: "pending" };
  }

  const totalWeight = jobs.reduce((sum, j) => sum + jobWeight(j.status), 0);
  const progress = Math.round((totalWeight / jobs.length) * 100);

  const allCompleted = jobs.every((j) => j.status === "completed");
  const allDone = jobs.every(
    (j) => j.status === "completed" || j.status === "failed"
  );

  let status: PhaseProgress["status"];
  if (allCompleted) {
    status = "completed";
  } else if (allDone || jobs.length > 0) {
    status = "active";
  } else {
    status = "pending";
  }

  return { phase: 2, name, progress, status };
}

// ── Phase 3: Update Addresses ───────────────────────────────────
// determine_addresses (email scan) → 0-25 %
// update_amazon / cashapp / doordash / southwest → 25-100 %
const ADDRESS_UPDATE_TYPES = new Set([
  "update_amazon_address",
  "update_cashapp_address",
  "update_southwest_address",
  "update_doordash_address",
]);

function computePhase3(allJobs: Job[]): PhaseProgress {
  const name = "Update Addresses";
  const scanJobs = allJobs.filter(
    (j) => j.type === "determine_addresses" && j.status !== "cancelled"
  );
  const updateJobs = allJobs.filter(
    (j) => ADDRESS_UPDATE_TYPES.has(j.type) && j.status !== "cancelled"
  );

  if (scanJobs.length === 0 && updateJobs.length === 0) {
    return { phase: 3, name, progress: 0, status: "pending" };
  }

  // ── Scan portion (0-25%) ──────────────────────────────────────
  const scanDone = scanJobs.length > 0 && scanJobs.every((j) => j.status === "completed");
  const scanRunning = scanJobs.some(
    (j) => j.status === "running" || j.status === "pending"
  );

  let scanProgress: number;
  if (scanDone) {
    scanProgress = 25;
  } else if (scanRunning) {
    const hasRunning = scanJobs.some((j) => j.status === "running");
    scanProgress = hasRunning ? 12 : 3;
  } else if (scanJobs.length > 0) {
    // failed
    scanProgress = 12;
  } else {
    scanProgress = 0;
  }

  // ── Update portion (25-75 remaining %) ────────────────────────
  let updateProgress = 0;
  if (updateJobs.length > 0) {
    const completed = updateJobs.filter(
      (j) => j.status === "completed" || j.status === "failed"
    ).length;
    updateProgress = Math.round((completed / updateJobs.length) * 75);
  }

  const progress = Math.min(scanProgress + updateProgress, 100);

  // Status
  const allCompleted =
    scanDone &&
    updateJobs.length > 0 &&
    updateJobs.every((j) => j.status === "completed");

  let status: PhaseProgress["status"];
  if (allCompleted) {
    status = "completed";
  } else if (scanJobs.length > 0 || updateJobs.length > 0) {
    status = "active";
  } else {
    status = "pending";
  }

  return { phase: 3, name, progress, status };
}

/**
 * Polls all jobs every 3 s and computes real-time progress for the
 * three pipeline phases.  Each phase updates independently so
 * parallel work (e.g. movers + addresses at the same time) is
 * reflected correctly.
 *
 * Phase 1 – Find Apartment:
 *   search_rentals complete = 50 %, apply jobs fill remaining 50 %
 *
 * Phase 3 – Update Addresses:
 *   determine_addresses (email scan) complete = 25 %,
 *   individual address updates fill remaining 75 %
 */
export function usePipelineProgress() {
  const [phases, setPhases] = useState<PhaseProgress[]>([
    { phase: 1, name: "Find Apartment", progress: 0, status: "pending" },
    { phase: 2, name: "Book Movers", progress: 0, status: "pending" },
    { phase: 3, name: "Update Addresses", progress: 0, status: "pending" },
  ]);

  const fetchAndCompute = useCallback(async () => {
    try {
      const allJobs = await getJobs();

      setPhases([
        computePhase1(allJobs),
        computePhase2(allJobs),
        computePhase3(allJobs),
      ]);
    } catch {
      // Keep existing state on transient errors
    }
  }, []);

  useEffect(() => {
    fetchAndCompute();
    const interval = setInterval(fetchAndCompute, 3000);
    return () => clearInterval(interval);
  }, [fetchAndCompute]);

  return phases;
}
