"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { askOpenClaw } from "@/lib/openclaw";
import { ActivityEvent } from "@/types";

/** Try to guess a severity from the log text */
function classifyLog(text: string): ActivityEvent["type"] {
  const lower = text.toLowerCase();
  if (
    lower.includes("failed") ||
    lower.includes("error") ||
    lower.includes("unable")
  )
    return "error";
  if (
    lower.includes("warning") ||
    lower.includes("manual review") ||
    lower.includes("requires") ||
    lower.includes("awaiting")
  )
    return "warning";
  if (
    lower.includes("completed") ||
    lower.includes("success") ||
    lower.includes("updated") ||
    lower.includes("accepted") ||
    lower.includes("confirmed")
  )
    return "success";
  return "info";
}

/** Extract plain-text lines from an OpenClaw response */
function parseLogLines(
  output: Array<{ type: string; content?: Array<{ type: string; text: string }>; [key: string]: unknown }>
): string[] {
  const lines: string[] = [];
  for (const block of output) {
    if (block.content) {
      for (const part of block.content) {
        if (part.type === "text" && part.text) {
          // Split on newlines so each line becomes its own log entry
          for (const line of part.text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.length > 0) lines.push(trimmed);
          }
        }
      }
    }
  }
  return lines;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function useOpenClawLogs() {
  const [logs, setLogs] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const counterRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    // Skip if a request is already in-flight
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const response = await askOpenClaw("Show me recent logs");

      const lines = parseLogLines(response.output ?? []);

      if (lines.length > 0) {
        const now = new Date();
        const newEvents: ActivityEvent[] = lines.map((line) => ({
          id: `log_${Date.now()}_${counterRef.current++}`,
          message: line,
          timestamp: now.toLocaleTimeString(),
          type: classifyLog(line),
        }));

        setLogs((prev) => {
          // Prepend new entries, cap at 50
          const merged = [...newEvents, ...prev];
          return merged.slice(0, 50);
        });
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return { logs, isLoading, error };
}
