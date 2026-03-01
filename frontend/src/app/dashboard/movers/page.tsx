"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Users, Clock, MapPin, ArrowRight } from "lucide-react";
import { getUhaulInformation, cancelJob, type UhaulInformation } from "@/lib/endpoints";
import { useJobStreams, type JobStream } from "@/hooks/use-job-streams";
import { AgentCard } from "@/components/agents/agent-card";
import { AgentOverlay } from "@/components/agents/agent-overlay";
import { AgentSession } from "@/types";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Map a Convex job status to the AgentSession status the UI expects. */
function mapJobStatus(status: string): AgentSession["status"] {
  switch (status) {
    case "running":
      return "running";
    case "pending":
      return "initializing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "running";
  }
}

const jobTypeLabels: Record<string, string> = {
  order_uhaul: "Booking Moving Truck",
  moving_analysis: "Analyzing Move Details",
};

function toAgentSession(stream: JobStream): AgentSession {
  const { job, latestScreenshot } = stream;
  return {
    id: job._id,
    targetSite: jobTypeLabels[job.type] ?? job.type,
    status: mapJobStatus(job.status),
    currentStep:
      latestScreenshot?.pageTitle ||
      job.status.charAt(0).toUpperCase() + job.status.slice(1),
    startedAt: new Date().toISOString(),
    elapsedSeconds: 0,
    logs: [],
    screenshotUrl: latestScreenshot?.url ?? undefined,
  };
}

export default function MoversPage() {
  const [bookings, setBookings] = useState<UhaulInformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    jobId: string;
    label: string;
  } | null>(null);

  // Poll bookings every 5 s so they appear as soon as the job completes
  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await getUhaulInformation();
        if (active) {
          setBookings(data);
          setError(null);
        }
      } catch (e: any) {
        if (active && bookings.length === 0) {
          setError(e.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get active mover-related jobs (order_uhaul & moving_analysis)
  const { streams } = useJobStreams();
  const moverStreams = useMemo(
    () =>
      streams.filter(
        (s) => s.job.type === "order_uhaul" || s.job.type === "moving_analysis"
      ),
    [streams]
  );

  const selectedStream =
    moverStreams.find((s) => s.job._id === selectedJobId) ?? null;

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelJob(cancelTarget.jobId);
      toast.success(`Cancelled ${cancelTarget.label}`);
    } catch {
      toast.error("Failed to cancel job");
    } finally {
      setCancelTarget(null);
    }
  };

  if (loading && moverStreams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading mover information...
        </span>
      </div>
    );
  }

  if (error && moverStreams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-400">Failed to load movers: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Live agent cards while jobs are running ─────────────── */}
      {moverStreams.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Booking in Progress</h2>
            <Badge
              variant="secondary"
              className="text-xs gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Live
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 auto-rows-[minmax(280px,1fr)]">
            {moverStreams.map((stream) => {
              const agent = toAgentSession(stream);
              return (
                <AgentCard
                  key={stream.job._id}
                  agent={agent}
                  compact
                  screenshotUrl={stream.latestScreenshot?.url}
                  onClick={() => setSelectedJobId(stream.job._id)}
                  onCancel={
                    stream.job.type === "order_uhaul"
                      ? () =>
                          setCancelTarget({
                            jobId: stream.job._id,
                            label: agent.targetSite,
                          })
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Completed booking cards ────────────────────────────── */}
      {bookings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">U-Haul Bookings</h2>
            <Badge variant="secondary" className="text-xs">
              {bookings.length} booking{bookings.length !== 1 && "s"}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map((booking) => (
              <Card key={booking._id} className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  {/* Vehicle & Provider */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-lg font-bold">{booking.vehicle}</h3>
                    </div>
                    {booking.movingHelpProvider && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Help by: {booking.movingHelpProvider}
                      </p>
                    )}
                  </div>

                  {/* Total cost */}
                  <div className="text-3xl font-bold">
                    ${booking.totalCost.toLocaleString()}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      total
                    </span>
                  </div>

                  {/* Route */}
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="text-xs text-muted-foreground">Pickup</p>
                        <p className="font-medium">{booking.pickupLocation}</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="text-xs text-muted-foreground">
                          Drop-off
                        </p>
                        <p className="font-medium">
                          {booking.dropOffLocation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{booking.pickupTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {booking.numWorkers} worker
                        {booking.numWorkers !== 1 && "s"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        {booking.numHours} hr
                        {booking.numHours !== 1 && "s"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No bookings and no active jobs */}
      {bookings.length === 0 && moverStreams.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">
            No mover bookings yet. Run the moving pipeline first.
          </p>
        </div>
      )}

      {/* ── Agent detail overlay ───────────────────────────────── */}
      {selectedStream && (() => {
        const overlayAgent = toAgentSession(selectedStream);
        return (
          <AgentOverlay
            agent={overlayAgent}
            onClose={() => setSelectedJobId(null)}
            onCancel={
              selectedStream.job.type === "order_uhaul"
                ? () =>
                    setCancelTarget({
                      jobId: selectedStream.job._id,
                      label: overlayAgent.targetSite,
                    })
                : undefined
            }
          />
        );
      })()}

      {/* ── Cancel confirmation dialog ─────────────────────────── */}
      <Dialog
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {cancelTarget?.label}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this job? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep Running
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              Cancel Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
