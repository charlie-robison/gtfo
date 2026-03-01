"use client";

import { cn } from "@/lib/utils";
import { mockPipelineState } from "@/data/mock-activity";
import { Check, Loader2 } from "lucide-react";

export function PipelineBar() {
  return (
    <div className="flex items-center gap-1 w-full">
      {mockPipelineState.phases.map((phase, i) => (
        <div key={phase.phase} className="flex-1 flex items-center gap-1">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium flex items-center gap-1">
                {phase.status === "completed" && (
                  <Check className="w-3 h-3 text-green-400" />
                )}
                {phase.status === "active" && (
                  <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                )}
                <span className={cn(
                  phase.status === "completed" && "text-green-400",
                  phase.status === "active" && "text-emerald-400",
                  phase.status === "pending" && "text-muted-foreground",
                )}>
                  {phase.name}
                </span>
              </span>
              <span className={cn(
                "text-[10px] font-mono",
                phase.status === "completed" && "text-green-400",
                phase.status === "active" && "text-emerald-400",
                phase.status === "pending" && "text-muted-foreground",
              )}>
                {phase.progress}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  phase.status === "completed" && "bg-green-500",
                  phase.status === "active" && "bg-emerald-500",
                  phase.status === "pending" && "bg-transparent",
                )}
                style={{ width: `${phase.progress}%` }}
              />
            </div>
          </div>
          {i < mockPipelineState.phases.length - 1 && (
            <div className={cn(
              "w-2 h-0.5 shrink-0 mt-3",
              phase.status === "completed" ? "bg-green-500/50" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
