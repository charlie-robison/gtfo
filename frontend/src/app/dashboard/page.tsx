"use client";

import { useMemo, useState } from "react";
import { PipelineBar } from "@/components/dashboard/pipeline-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AgentCard } from "@/components/agents/agent-card";
import { AgentOverlay } from "@/components/agents/agent-overlay";
import { useJobStreams, type JobStream } from "@/hooks/use-job-streams";
import { cancelJob } from "@/lib/endpoints";
import { AgentSession } from "@/types";
import { Loader2, RefreshCw, Search, Mail, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OverrideDialog } from "@/components/dashboard/override-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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

/** Friendly label for job types. */
const jobTypeLabels: Record<string, string> = {
  search_rentals: "Redfin Search",
  order_uhaul: "U-Haul Booking",
  update_amazon_address: "Amazon",
  order_furniture: "Amazon Furniture",
  update_cashapp_address: "Cash App",
  update_southwest_address: "Southwest",
  update_doordash_address: "DoorDash",
  determine_addresses: "Finding Sites to Change Addresses",
  cancel_lease: "Send Cancel Email",
};

/** Job types that support cancellation. */
const cancellableJobTypes = new Set([
  "order_uhaul",
  "update_amazon_address",
  "order_furniture",
  "update_cashapp_address",
  "update_southwest_address",
  "update_doordash_address",
]);

/** Job types that show a hero icon instead of a browser screenshot. */
const heroIcons: Record<string, LucideIcon> = {
  determine_addresses: Search,
  cancel_lease: Mail,
};

/** Build an AgentSession from a JobStream so existing card/overlay components work. */
function toAgentSession(stream: JobStream): AgentSession {
  const { job, latestScreenshot } = stream;
  return {
    id: job._id,
    targetSite: jobTypeLabels[job.type] ?? job.type,
    status: mapJobStatus(job.status),
    currentStep: latestScreenshot?.pageTitle || `Job ${job.status}`,
    startedAt: new Date().toISOString(),
    elapsedSeconds: 0,
    logs: [],
    screenshotUrl: latestScreenshot?.url ?? undefined,
  };
}

export default function DashboardPage() {
  const { streams, loading, error } = useJobStreams();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ jobId: string; label: string } | null>(null);

  // Sort: running first, then pending/initializing
  const sorted = useMemo(() => {
    const order = ["running", "pending"];
    return [...streams].sort(
      (a, b) => order.indexOf(a.job.status) - order.indexOf(b.job.status)
    );
  }, [streams]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelJob(cancelTarget.jobId);
      toast.success(`Cancelled ${cancelTarget.label}`);
    } catch (e) {
      toast.error("Failed to cancel job");
      console.error("Failed to cancel job:", e);
    } finally {
      setCancelTarget(null);
    }
  };

  const selectedStream = sorted.find((s) => s.job._id === selectedJobId) ?? null;

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-3">
      {/* Pipeline bar + Override button */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <PipelineBar />
        </div>
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={() => setOverrideOpen(true)}
        >
          <RefreshCw className="w-4 h-4" />
          Override
        </Button>
      </div>

      <OverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} />

      {/* Main content: agents + activity */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Live Agents grid — direction trick puts scrollbar on left */}
        <div className="flex-1 min-w-0 overflow-auto" dir="rtl">
          {loading ? (
            <div className="flex items-center justify-center h-full" dir="ltr">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading jobs...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full" dir="ltr">
              <p className="text-sm text-red-400">Failed to load jobs: {error}</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center h-full" dir="ltr">
              <p className="text-sm text-muted-foreground">No active jobs running.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-[minmax(200px,1fr)]" dir="ltr">
              {sorted.map((stream) => {
                const agent = toAgentSession(stream);
                const isCancellable = cancellableJobTypes.has(stream.job.type);
                return (
                  <AgentCard
                    key={stream.job._id}
                    agent={agent}
                    compact
                    screenshotUrl={stream.latestScreenshot?.url}
                    onClick={() => setSelectedJobId(stream.job._id)}
                    onCancel={isCancellable ? () => setCancelTarget({ jobId: stream.job._id, label: agent.targetSite }) : undefined}
                    heroIcon={heroIcons[stream.job.type]}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Activity feed sidebar */}
        <div className="hidden lg:block w-72 shrink-0 overflow-auto">
          <ActivityFeed />
        </div>
      </div>

      {/* Agent detail overlay */}
      {selectedStream && (() => {
        const overlayAgent = toAgentSession(selectedStream);
        const isCancellable = cancellableJobTypes.has(selectedStream.job.type);
        return (
          <AgentOverlay
            agent={overlayAgent}
            onClose={() => setSelectedJobId(null)}
            onCancel={isCancellable ? () => setCancelTarget({ jobId: selectedStream.job._id, label: overlayAgent.targetSite }) : undefined}
          />
        );
      })()}

      {/* Cancel confirmation dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {cancelTarget?.label}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this job? This action cannot be undone.
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
