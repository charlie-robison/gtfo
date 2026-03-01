"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentSession, AgentStatus } from "@/types";
import { AgentScreenshot } from "./agent-screenshot";
import { cn } from "@/lib/utils";
import { Check, Loader2, AlertTriangle, XCircle, Ban } from "lucide-react";

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
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
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

interface AgentCardProps {
  agent: AgentSession;
  compact?: boolean;
  onClick?: () => void;
  onCancel?: () => void;
  screenshotUrl?: string | null;
}

export function AgentCard({ agent, compact, onClick, onCancel, screenshotUrl }: AgentCardProps) {
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;

  if (compact) {
    const agentUrl = siteUrls[agent.targetSite] || `https://${agent.targetSite.toLowerCase().replace(/\s+/g, "")}.com`;

    return (
      <Card
        className={cn(
          "flex flex-col h-full py-0 gap-0 cursor-pointer transition-colors hover:border-emerald-500/40",
          agent.status === "waiting_approval" && "border-amber-500/30"
        )}
        onClick={onClick}
      >
        <CardContent className="p-1.5 flex flex-col gap-1 flex-1 min-h-0">
          {/* Header row */}
          <div className="flex items-center gap-1.5 px-1 shrink-0">
            <h3 className="text-[11px] font-semibold truncate">{agent.targetSite}</h3>
            <span className="text-[10px] text-muted-foreground truncate flex-1">{agent.currentStep}</span>
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
            {onCancel && (agent.status === "running" || agent.status === "initializing") && (
              <Button
                variant="outline"
                size="sm"
                className="h-5 px-1.5 text-[10px] gap-0.5 shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={(e) => { e.stopPropagation(); onCancel(); }}
              >
                <Ban className="w-2.5 h-2.5" />
                Cancel
              </Button>
            )}
          </div>
          {/* Live screenshot — fills remaining space */}
          <AgentScreenshot url={agentUrl} status={agent.status} compact screenshotUrl={screenshotUrl} />
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
          screenshotUrl={screenshotUrl}
        />
        {agent.status === "waiting_approval" && (
          <div className="flex justify-end">
            <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 gap-1">
              <Check className="w-3 h-3" />
              Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
