"use client";

import { useEffect, useRef, useState } from "react";
import { AgentSession, AgentStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Check, Clock, Loader2, AlertTriangle, XCircle, Monitor, Ban, Mail, type LucideIcon } from "lucide-react";
import { getScreenshotsByJobId, type Screenshot } from "@/lib/endpoints";

const statusConfig: Record<
  AgentStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  initializing: {
    label: "Initializing",
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    icon: Loader2,
  },
  running: {
    label: "Running",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Loader2,
  },
  waiting_approval: {
    label: "Needs Approval",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: AlertTriangle,
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
    icon: Check,
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: XCircle,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    icon: XCircle,
  },
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface AgentOverlayProps {
  agent: AgentSession;
  onClose: () => void;
  onCancel?: () => void;
  /** When set, renders an email-themed display instead of browser chrome. */
  heroIcon?: LucideIcon;
}

export function AgentOverlay({ agent, onClose, onCancel, heroIcon: HeroIcon }: AgentOverlayProps) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll screenshots for this job every 500 ms
  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const data = await getScreenshotsByJobId(agent.id);
        if (!active) return;
        setScreenshots((prev) => {
          if (data.length === prev.length) return prev;
          // Auto-scroll timeline to bottom when new screenshots arrive
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
          }, 50);
          return data;
        });
      } catch {
        // ignore errors during polling
      }
    }

    poll();
    const interval = setInterval(poll, 500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [agent.id]);

  // The "live view" shows either a selected screenshot or the latest one
  const displayScreenshot =
    selectedIndex !== null
      ? screenshots[selectedIndex]
      : screenshots[screenshots.length - 1] ?? null;

  const displayUrl = displayScreenshot?.pageUrl || agent.currentStep;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Overlay content */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{agent.targetSite}</h2>
            <Badge
              variant="outline"
              className={cn("text-xs gap-1", status.className)}
            >
              <StatusIcon
                className={cn(
                  "w-3.5 h-3.5",
                  (agent.status === "running" || agent.status === "initializing") && "animate-spin"
                )}
              />
              {status.label}
            </Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatElapsed(agent.elapsedSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {agent.status === "waiting_approval" && (
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 gap-1">
                <Check className="w-3.5 h-3.5" />
                Approve
              </Button>
            )}
            {onCancel && (agent.status === "running" || agent.status === "initializing") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={onCancel}
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main content — big screenshot left, snapshot strip right */}
        <div className="flex-1 min-h-0 flex">
          {/* Live browser view or email-themed hero */}
          <div className="flex-1 min-w-0 p-4 flex flex-col">
            {HeroIcon ? (
              <>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400/70" />
                  <span className="text-emerald-400/70 font-medium">AgentMail</span>
                </p>
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col relative">
                  {/* Subtle background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-blue-500/[0.04]" />
                  {/* Email chrome bar */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 relative z-10">
                    <Mail className="w-4 h-4 text-emerald-500/60" />
                    <span className="text-xs font-medium text-emerald-400/70">AgentMail</span>
                    <div className="flex-1 bg-zinc-800 rounded px-3 py-1 ml-2">
                      <p className="text-xs text-zinc-400 font-mono truncate">agentmail://inbox</p>
                    </div>
                    {(agent.status === "running" || agent.status === "initializing") && (
                      <span className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-[10px] text-zinc-500">processing</span>
                      </span>
                    )}
                  </div>
                  {/* Hero content */}
                  <div className="flex-1 min-h-0 relative z-10 flex flex-col items-center justify-center gap-4">
                    <div className={cn(
                      "w-20 h-20 rounded-full border-2 border-emerald-500/20 bg-emerald-500/[0.07] flex items-center justify-center",
                      (agent.status === "running" || agent.status === "initializing") && "animate-pulse"
                    )}>
                      <HeroIcon className="w-9 h-9 text-emerald-400/80" />
                    </div>
                    <div className="text-center max-w-sm">
                      <p className="text-lg font-semibold text-zinc-200">{agent.targetSite}</p>
                      <p className="text-sm text-zinc-500 mt-1">{agent.currentStep}</p>
                      <p className="text-xs text-zinc-600 mt-3">
                        Reading and sending emails via AgentMail
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  Live Browser View
                </p>
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 shrink-0">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="flex-1 bg-zinc-800 rounded px-3 py-1 ml-2">
                      <p className="text-xs text-zinc-400 font-mono truncate">{displayUrl}</p>
                    </div>
                  </div>
                  {/* Screenshot / placeholder */}
                  <div className={cn(
                    "flex-1 min-h-0 relative flex items-center justify-center",
                    agent.status === "running" && !displayScreenshot && "animate-pulse",
                  )}>
                    {displayScreenshot?.url ? (
                      <img
                        src={displayScreenshot.url}
                        alt={displayScreenshot.pageTitle || "Screenshot"}
                        className="absolute inset-0 w-full h-full object-contain bg-black"
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent" />
                        <div className="flex flex-col items-center gap-2 text-zinc-600">
                          <Monitor className="w-12 h-12" />
                          <span className="text-sm font-mono">Live View</span>
                          <span className="text-xs text-zinc-700">{agent.currentStep}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Screenshot timeline strip */}
          <div className="w-64 border-l border-border flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-border shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Screenshots ({screenshots.length})
              </p>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-auto p-2 space-y-2">
              {screenshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-700">
                  <Monitor className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-mono">Waiting for screenshots...</span>
                </div>
              ) : (
                screenshots.map((snap, i) => {
                  const isSelected = selectedIndex === i;
                  const isLatest = selectedIndex === null && i === screenshots.length - 1;
                  return (
                    <div
                      key={snap._id}
                      className={cn(
                        "rounded-lg border overflow-hidden cursor-pointer transition-colors",
                        isSelected || isLatest
                          ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                          : "border-zinc-800 hover:border-zinc-600"
                      )}
                      onClick={() => setSelectedIndex(i)}
                    >
                      {/* Mini browser chrome */}
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900/80 border-b border-zinc-800">
                        <div className="flex gap-0.5">
                          <div className="w-1 h-1 rounded-full bg-red-500/40" />
                          <div className="w-1 h-1 rounded-full bg-yellow-500/40" />
                          <div className="w-1 h-1 rounded-full bg-green-500/40" />
                        </div>
                        <p className="text-[7px] text-zinc-600 font-mono truncate ml-1">
                          {snap.pageUrl || snap.pageTitle || `Step ${snap.stepNumber}`}
                        </p>
                      </div>
                      {/* Thumbnail */}
                      <div className="h-24 bg-zinc-950 relative flex items-center justify-center">
                        {snap.url ? (
                          <img
                            src={snap.url}
                            alt={snap.pageTitle || "Screenshot"}
                            className="absolute inset-0 w-full h-full object-cover object-top"
                          />
                        ) : (
                          <>
                            <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-white to-transparent" />
                            <Monitor className="w-4 h-4 text-zinc-800" />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
