"use client";

import { AgentSession, AgentStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, Check, Clock, Loader2, AlertTriangle, XCircle, Monitor } from "lucide-react";

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
};

const siteUrls: Record<string, string> = {
  "Bank of America": "https://bankofamerica.com/profile/settings",
  "Robinhood": "https://robinhood.com/account/personal-info",
  "UBS": "https://ubs.com/profile/address",
  "Venmo": "https://venmo.com/account/settings",
  "Tesla": "https://tesla.com/account/profile",
  "Amazon": "https://amazon.com/addresses",
  "Chase": "https://chase.com/personal/profile",
  "Wells Fargo": "https://wellsfargo.com/myaccount/address",
  "Fidelity": "https://fidelity.com/account/profile",
  "Netflix": "https://netflix.com/account/billing",
  "Spotify": "https://spotify.com/account/profile",
  "Citi": "https://online.citi.com/profile/settings",
  "Progressive": "https://progressive.com/myaccount/policy",
  "USPS": "https://moversguide.usps.com/mgo",
  "DMV": "https://dmv.ca.gov/online/address-change",
  "Kaiser Permanente": "https://healthy.kaiserpermanente.org/profile",
  "State Farm": "https://statefarm.com/account/profile",
  "Verizon": "https://verizon.com/myaccount/profile",
  "Comcast": "https://xfinity.com/myaccount/settings",
  "PG&E": "https://pge.com/myaccount/service",
  "American Express": "https://americanexpress.com/account/settings",
  "DoorDash": "https://doordash.com/consumer/account",
  "Uber": "https://riders.uber.com/settings",
  "Target": "https://target.com/account/addresses",
  "Walmart": "https://walmart.com/account/addresses",
  "Apple": "https://appleid.apple.com/account/manage",
  "Google": "https://myaccount.google.com/address",
  "PayPal": "https://paypal.com/myaccount/settings/address",
  "Schwab": "https://schwab.com/client-home/profile",
  "IRS": "https://irs.gov/forms/form-8822",
};

function generateSnapshots(agent: AgentSession) {
  const domain = agent.targetSite.toLowerCase().replace(/\s+/g, "");
  const base = [
    { label: "Login page", url: `https://${domain}.com/login`, time: "0:03" },
    { label: "Entering credentials", url: `https://${domain}.com/login`, time: "0:08" },
  ];

  if (agent.status === "failed") {
    return [
      ...base,
      { label: "Submitting login", url: `https://${domain}.com/login`, time: "0:12" },
      { label: "Security challenge", url: `https://${domain}.com/verify`, time: "0:18" },
      { label: "Blocked — manual required", url: `https://${domain}.com/verify`, time: "0:25" },
    ];
  }

  const loggedIn = [
    ...base,
    { label: "Logged in — home", url: `https://${domain}.com/dashboard`, time: "0:12" },
    { label: "Navigating to settings", url: `https://${domain}.com/settings`, time: "0:18" },
    { label: "Found profile page", url: `https://${domain}.com/settings/profile`, time: "0:24" },
    { label: "Address section located", url: `https://${domain}.com/settings/address`, time: "0:30" },
    { label: "Clicking edit", url: `https://${domain}.com/settings/address?edit=1`, time: "0:35" },
    { label: "Clearing old address", url: `https://${domain}.com/settings/address?edit=1`, time: "0:40" },
    { label: "Typing new address", url: `https://${domain}.com/settings/address?edit=1`, time: "0:45" },
  ];

  if (agent.status === "waiting_approval") {
    return [
      ...loggedIn,
      { label: "Form filled — awaiting approval", url: `https://${domain}.com/settings/address?edit=1`, time: "0:52" },
    ];
  }

  if (agent.status === "completed") {
    return [
      ...loggedIn,
      { label: "Submitting change", url: `https://${domain}.com/settings/address?edit=1`, time: "0:52" },
      { label: "Address confirmed", url: `https://${domain}.com/settings/address`, time: "0:56" },
    ];
  }

  return loggedIn;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface AgentOverlayProps {
  agent: AgentSession;
  onClose: () => void;
}

export function AgentOverlay({ agent, onClose }: AgentOverlayProps) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;
  const agentUrl = siteUrls[agent.targetSite] || `https://${agent.targetSite.toLowerCase().replace(/\s+/g, "")}.com`;
  const snapshots = generateSnapshots(agent);

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
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main content — big screenshot left, snapshot strip right */}
        <div className="flex-1 min-h-0 flex">
          {/* Live browser view */}
          <div className="flex-1 min-w-0 p-4 flex flex-col">
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
                  <p className="text-xs text-zinc-400 font-mono">{agentUrl}</p>
                </div>
              </div>
              {/* Screenshot placeholder */}
              <div className={cn(
                "flex-1 min-h-0 relative flex items-center justify-center",
                agent.status === "running" && "animate-pulse",
              )}>
                <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent" />
                <div className="flex flex-col items-center gap-2 text-zinc-600">
                  <Monitor className="w-12 h-12" />
                  <span className="text-sm font-mono">Live View</span>
                  <span className="text-xs text-zinc-700">{agent.currentStep}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Screenshot timeline strip */}
          <div className="w-64 border-l border-border flex flex-col shrink-0">
            <div className="px-3 py-3 border-b border-border shrink-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Screenshots ({snapshots.length})
              </p>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {snapshots.map((snap, i) => {
                const isLatest = i === snapshots.length - 1;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border overflow-hidden cursor-pointer transition-colors",
                      isLatest
                        ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
                        : "border-zinc-800 hover:border-zinc-600"
                    )}
                  >
                    {/* Mini browser chrome */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900/80 border-b border-zinc-800">
                      <div className="flex gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-red-500/40" />
                        <div className="w-1 h-1 rounded-full bg-yellow-500/40" />
                        <div className="w-1 h-1 rounded-full bg-green-500/40" />
                      </div>
                      <p className="text-[7px] text-zinc-600 font-mono truncate ml-1">{snap.url}</p>
                    </div>
                    {/* Screenshot placeholder */}
                    <div className="h-24 bg-zinc-950 relative flex items-center justify-center">
                      <div className="absolute inset-0 opacity-[0.02] bg-gradient-to-br from-white to-transparent" />
                      <Monitor className="w-4 h-4 text-zinc-800" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
