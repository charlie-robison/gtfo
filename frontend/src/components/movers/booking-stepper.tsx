"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Searching", status: "completed" as const },
  { label: "Comparing", status: "completed" as const },
  { label: "Awaiting Selection", status: "active" as const },
  { label: "Confirmed", status: "pending" as const },
];

export function BookingStepper() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full",
                    step.status === "completed" &&
                      "bg-green-500/20 text-green-400",
                    step.status === "active" &&
                      "bg-emerald-500/20 text-emerald-400",
                    step.status === "pending" &&
                      "bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : step.status === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                </div>
                <span className="text-[10px] font-medium text-center">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-18px]",
                    step.status === "completed"
                      ? "bg-green-500/50"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
