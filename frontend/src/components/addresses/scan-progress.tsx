"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Mail, Scan } from "lucide-react";
import { mockPipelineState } from "@/data/mock-activity";

export function ScanProgress() {
  return (
    <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 rounded-lg bg-emerald-500/20">
          <Scan className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">Email Scan Complete</h3>
          <p className="text-sm text-muted-foreground">
            Scanned{" "}
            <span className="text-foreground font-mono font-bold">
              {mockPipelineState.totalEmailsScanned.toLocaleString()}
            </span>{" "}
            emails and detected{" "}
            <span className="text-foreground font-mono font-bold">
              {mockPipelineState.totalServicesDetected}
            </span>{" "}
            services that need address updates
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="w-4 h-4" />
          <span className="font-mono">
            {mockPipelineState.totalEmailsScanned.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
