"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentSession, AgentStatus } from "@/types";
import { AgentScreenshot } from "./agent-screenshot";
import { cn } from "@/lib/utils";
import { Check, Clock, Loader2, AlertTriangle, XCircle } from "lucide-react";

const statusConfig: Record<
  AgentStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  initializing: {
    label: "Init",
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    icon: Loader2,
  },
  running: {
    label: "Running",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Loader2,
  },
  waiting_approval: {
    label: "Review",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: AlertTriangle,
  },
  completed: {
    label: "Done",
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
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

interface AgentCardProps {
  agent: AgentSession;
  compact?: boolean;
}

export function AgentCard({ agent, compact }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;

  if (compact) {
    const agentUrl = siteUrls[agent.targetSite] || `https://${agent.targetSite.toLowerCase().replace(/\s+/g, "")}.com`;

    return (
      <Card
        className={cn(
          "flex flex-col h-full py-0 gap-0",
          agent.status === "waiting_approval" && "border-amber-500/30"
        )}
      >
        <CardContent className="p-1.5 flex flex-col gap-1 flex-1 min-h-0">
          {/* Header: name + step + status + time — single row */}
          <div className="flex items-center gap-1.5 px-1 shrink-0">
            <h3 className="text-[11px] font-semibold whitespace-nowrap">{agent.targetSite}</h3>
            <span className="text-[10px] text-muted-foreground truncate flex-1">{agent.currentStep}</span>
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0">
              <Clock className="w-2.5 h-2.5" />
              {formatElapsed(agent.elapsedSeconds)}
            </span>
            <Badge
              variant="outline"
              className={cn("text-[9px] gap-0.5 px-1 py-0 shrink-0", status.className)}
            >
              <StatusIcon
                className={cn(
                  "w-2.5 h-2.5",
                  (agent.status === "running" || agent.status === "initializing") && "animate-spin"
                )}
              />
              {status.label}
            </Badge>
            {agent.status === "waiting_approval" && (
              <Button size="sm" className="h-5 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 gap-0.5 shrink-0">
                <Check className="w-2.5 h-2.5" />
                Approve
              </Button>
            )}
          </div>
          {/* Live screenshot — fills remaining space */}
          <AgentScreenshot url={agentUrl} status={agent.status} compact />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "flex flex-col",
        agent.status === "waiting_approval" && "border-amber-500/30"
      )}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{agent.targetSite}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {agent.currentStep}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("text-[10px] gap-1 shrink-0", status.className)}
          >
            <StatusIcon
              className={cn(
                "w-3 h-3",
                (agent.status === "running" || agent.status === "initializing") && "animate-spin"
              )}
            />
            {status.label}
          </Badge>
        </div>
        <AgentScreenshot
          url={siteUrls[agent.targetSite] || `https://${agent.targetSite.toLowerCase().replace(/\s+/g, "")}.com`}
          status={agent.status}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatElapsed(agent.elapsedSeconds)}
          </div>
          {agent.status === "waiting_approval" && (
            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 gap-1">
              <Check className="w-3 h-3" />
              Approve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
