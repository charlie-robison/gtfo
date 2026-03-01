"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockPipelineState } from "@/data/mock-activity";

interface PhaseProgressProps {
  compact?: boolean;
}

export function PhaseProgress({ compact }: PhaseProgressProps) {
  return (
    <Card>
      <CardHeader className={compact ? "p-3 pb-2" : "pb-3"}>
        <CardTitle className="text-sm font-medium">Pipeline Progress</CardTitle>
      </CardHeader>
      <CardContent className={cn(compact ? "p-3 pt-0 space-y-2" : "space-y-4")}>
        {mockPipelineState.phases.map((phase) => (
          <div key={phase.phase} className={compact ? "space-y-1" : "space-y-2"}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full",
                    compact ? "w-5 h-5" : "w-6 h-6",
                    phase.status === "completed" &&
                      "bg-green-500/20 text-green-400",
                    phase.status === "active" &&
                      "bg-emerald-500/20 text-emerald-400",
                    phase.status === "pending" &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {phase.status === "completed" ? (
                    <Check className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                  ) : phase.status === "active" ? (
                    <Loader2 className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", "animate-spin")} />
                  ) : (
                    <Circle className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                  )}
                </div>
                <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
                  Phase {phase.phase}: {phase.name}
                </span>
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  phase.status === "completed" && "text-green-400",
                  phase.status === "active" && "text-emerald-400",
                  phase.status === "pending" && "text-muted-foreground"
                )}
              >
                {phase.progress}%
              </span>
            </div>
            <Progress
              value={phase.progress}
              className={cn(
                compact ? "h-1.5" : "h-2",
                phase.status === "completed" && "[&>div]:bg-green-500",
                phase.status === "active" && "[&>div]:bg-emerald-500",
                phase.status === "pending" && "[&>div]:bg-muted"
              )}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
