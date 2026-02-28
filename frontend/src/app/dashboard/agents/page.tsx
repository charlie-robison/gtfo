import { AgentCard } from "@/components/agents/agent-card";
import { mockAgents } from "@/data/mock-agents";

export default function AgentsPage() {
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
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
