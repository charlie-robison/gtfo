"use client";

import { useState, useEffect, useCallback } from "react";
import { AddressAccount, UpdateStatus, AgentLogEntry } from "@/types";
import { mockServices } from "@/data/mock-services";
import { mockAgents } from "@/data/mock-agents";

const statusProgression: UpdateStatus[] = [
  "detected",
  "queued",
  "in_progress",
  "needs_review",
  "completed",
];

function nextStatus(current: UpdateStatus): UpdateStatus | null {
  if (current === "failed" || current === "completed") return null;
  const idx = statusProgression.indexOf(current);
  if (idx === -1 || idx >= statusProgression.length - 1) return null;
  return statusProgression[idx + 1];
}

export function useMockRealtime() {
  const [services, setServices] = useState<AddressAccount[]>(() => [...mockServices]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setServices((prev) => {
        const updatable = prev.filter(
          (s) => s.status !== "completed" && s.status !== "failed"
        );
        if (updatable.length === 0) return prev;

        const target = updatable[Math.floor(Math.random() * updatable.length)];
        const next = nextStatus(target.status);
        if (!next) return prev;

        return prev.map((s) =>
          s.id === target.id ? { ...s, status: next } : s
        );
      });
      setTick((t) => t + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return { services, tick };
}
