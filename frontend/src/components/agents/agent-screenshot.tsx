"use client";

import { cn } from "@/lib/utils";
import { Monitor } from "lucide-react";

interface AgentScreenshotProps {
  url: string;
  status: string;
  compact?: boolean;
}

export function AgentScreenshot({ url, status, compact }: AgentScreenshotProps) {
  return (
    <div className={cn(
      "rounded overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col",
      compact ? "flex-1 min-h-0" : "h-40"
    )}>
      {/* Browser chrome bar */}
      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900/80 border-b border-zinc-800 shrink-0">
        <div className="flex gap-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
        </div>
        <div className="flex-1 bg-zinc-800/60 rounded px-1.5 py-px ml-1">
          <p className="text-[8px] text-zinc-500 truncate font-mono">{url}</p>
        </div>
      </div>
      {/* Screenshot area — fills all remaining space */}
      <div className={cn(
        "flex-1 min-h-0 relative flex items-center justify-center",
        status === "running" && "animate-pulse",
      )}>
        <div className="absolute inset-0 opacity-[0.03] bg-gradient-to-br from-white to-transparent" />
        <div className="flex flex-col items-center gap-0.5 text-zinc-700">
          <Monitor className="w-4 h-4" />
          <span className="text-[8px] font-mono">Live View</span>
        </div>
      </div>
    </div>
  );
}
