"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Info, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockActivity } from "@/data/mock-activity";
import { ActivityEvent } from "@/types";

const iconMap = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap = {
  success: "text-green-400",
  info: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

function ActivityItem({ event }: { event: ActivityEvent }) {
  const Icon = iconMap[event.type];
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", colorMap[event.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-tight">{event.message}</p>
        <p className="text-[10px] text-muted-foreground">{event.timestamp}</p>
      </div>
    </div>
  );
}

export function ActivityFeed() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-3 pb-2 shrink-0">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 overflow-auto">
        {mockActivity.map((event) => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </CardContent>
    </Card>
  );
}
