"use client";

import { useState } from "react";
import { PipelineBar } from "@/components/dashboard/pipeline-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AgentCard } from "@/components/agents/agent-card";
import { AgentOverlay } from "@/components/agents/agent-overlay";
import { mockAgents } from "@/data/mock-agents";
import { AgentSession } from "@/types";

export default function DashboardPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentSession | null>(null);

  const sortOrder = [
    "waiting_approval",
    "running",
    "initializing",
    "completed",
    "failed",
  ];
  const sorted = [...mockAgents].sort(
    (a, b) => sortOrder.indexOf(a.status) - sortOrder.indexOf(b.status)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] gap-3">
      {/* Pipeline bar across the top */}
      <PipelineBar />

      {/* Main content: agents + activity */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Live Agents grid — direction trick puts scrollbar on left */}
        <div className="flex-1 min-w-0 overflow-auto" dir="rtl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-[minmax(200px,1fr)]" dir="ltr">
            {sorted.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                compact
                onClick={() => setSelectedAgent(agent)}
              />
            ))}
          </div>
        </div>

        {/* Activity feed sidebar */}
        <div className="hidden lg:block w-72 shrink-0 overflow-auto">
          <ActivityFeed />
        </div>
      </div>

      {/* Agent detail overlay */}
      {selectedAgent && (
        <AgentOverlay
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
