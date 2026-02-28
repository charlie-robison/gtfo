"use client";

import { PipelineBar } from "@/components/dashboard/pipeline-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AgentCard } from "@/components/agents/agent-card";
import { mockAgents } from "@/data/mock-agents";

export default function DashboardPage() {
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
    <div className="flex flex-col h-[calc(100vh-3.5rem)] gap-3">
      {/* Pipeline bar across the top */}
      <PipelineBar />

      {/* Main content: agents + activity */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Live Agents grid */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-[minmax(200px,1fr)]">
            {sorted.map((agent) => (
              <AgentCard key={agent.id} agent={agent} compact />
            ))}
          </div>
        </div>

        {/* Activity feed sidebar */}
        <div className="hidden lg:block w-72 shrink-0 overflow-auto">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
