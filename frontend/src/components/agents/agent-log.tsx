"use client";

import { cn } from "@/lib/utils";
import { AgentLogEntry } from "@/types";

const typeColors: Record<string, string> = {
  info: "text-gray-400",
  action: "text-emerald-400",
  success: "text-green-400",
  error: "text-red-400",
  waiting: "text-amber-400",
};

interface AgentLogProps {
  logs: AgentLogEntry[];
  compact?: boolean;
}

export function AgentLog({ logs, compact }: AgentLogProps) {
  return (
    <div
      className={cn(
        "bg-zinc-950 rounded-lg overflow-y-auto font-mono space-y-0.5",
        compact ? "p-2 text-[10px] h-full max-h-24" : "p-3 text-xs max-h-40"
      )}
    >
      {logs.map((log, i) => (
        <div key={i} className={cn("flex", compact ? "gap-1.5" : "gap-2")}>
          <span className="text-zinc-600 shrink-0">{compact ? log.timestamp.slice(-5) : log.timestamp}</span>
          <span className={cn(typeColors[log.type])}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}
