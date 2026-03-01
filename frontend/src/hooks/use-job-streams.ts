"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getJobs, getScreenshotsByJobId, type Job, type Screenshot } from "@/lib/endpoints";

export interface JobStream {
  job: Job;
  screenshots: Screenshot[];
  latestScreenshot: Screenshot | null;
}

/**
 * Fetches all active (non-completed, non-failed) jobs, then polls
 * each job's screenshots every 500 ms to create a live "video stream".
 */
export function useJobStreams() {
  const [streams, setStreams] = useState<JobStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track active job IDs so screenshot polling knows what to fetch
  const activeJobIds = useRef<string[]>([]);
  // Keep mutable ref to latest streams for screenshot polling to merge into
  const streamsRef = useRef<JobStream[]>([]);

  // ── Fetch jobs (every 3 s) ──────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const allJobs = await getJobs();
      const active = allJobs.filter(
        (j) => j.status !== "completed" && j.status !== "failed"
      );

      activeJobIds.current = active.map((j) => j._id);

      // Merge with existing streams – keep screenshots we already have
      setStreams((prev) => {
        const prevMap = new Map(prev.map((s) => [s.job._id, s]));
        const next = active.map((job) => {
          const existing = prevMap.get(job._id);
          return {
            job,
            screenshots: existing?.screenshots ?? [],
            latestScreenshot: existing?.latestScreenshot ?? null,
          };
        });
        streamsRef.current = next;
        return next;
      });

      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Poll screenshots for all active jobs (every 500 ms) ─────────
  const pollScreenshots = useCallback(async () => {
    const ids = activeJobIds.current;
    if (ids.length === 0) return;

    const results = await Promise.allSettled(
      ids.map((id) => getScreenshotsByJobId(id))
    );

    setStreams((prev) => {
      let changed = false;
      const next = prev.map((stream, i) => {
        const result = results[i];
        if (!result || result.status === "rejected") return stream;

        const screenshots = result.value;
        if (screenshots.length === stream.screenshots.length) return stream;

        changed = true;
        return {
          ...stream,
          screenshots,
          latestScreenshot: screenshots[screenshots.length - 1] ?? null,
        };
      });

      if (!changed) return prev;
      streamsRef.current = next;
      return next;
    });
  }, []);

  // ── Set up intervals ────────────────────────────────────────────
  useEffect(() => {
    // Initial fetch
    fetchJobs();

    // Poll jobs every 3 seconds (to pick up new jobs / status changes)
    const jobInterval = setInterval(fetchJobs, 3000);

    // Poll screenshots every 500 ms for the "video" effect
    const screenshotInterval = setInterval(pollScreenshots, 500);

    return () => {
      clearInterval(jobInterval);
      clearInterval(screenshotInterval);
    };
  }, [fetchJobs, pollScreenshots]);

  return { streams, loading, error };
}
