import { ActivityEvent, PipelineState } from "@/types";

export const mockActivity: ActivityEvent[] = [
  {
    id: "evt_001",
    message: "Amazon address updated successfully",
    timestamp: "2 min ago",
    type: "success",
  },
  {
    id: "evt_002",
    message: "Robinhood agent started address update",
    timestamp: "5 min ago",
    type: "info",
  },
  {
    id: "evt_003",
    message: "Citi requires manual review — security verification",
    timestamp: "8 min ago",
    type: "warning",
  },
  {
    id: "evt_004",
    message: "UBS form pre-filled, awaiting approval",
    timestamp: "12 min ago",
    type: "warning",
  },
  {
    id: "evt_005",
    message: "Tesla update failed — 2FA hardware key required",
    timestamp: "15 min ago",
    type: "error",
  },
  {
    id: "evt_006",
    message: "100 Riverfront Dr application accepted!",
    timestamp: "20 min ago",
    type: "success",
  },
  {
    id: "evt_007",
    message: "Fidelity Investments address updated",
    timestamp: "25 min ago",
    type: "success",
  },
  {
    id: "evt_008",
    message: "5 new mover quotes received",
    timestamp: "30 min ago",
    type: "info",
  },
  {
    id: "evt_009",
    message: "Scanned 3,082 emails — 41 services detected",
    timestamp: "45 min ago",
    type: "info",
  },
  {
    id: "evt_010",
    message: "Progressive Insurance address confirmed",
    timestamp: "1 hr ago",
    type: "success",
  },
];

export const mockPipelineState: PipelineState = {
  phases: [
    { phase: 1, name: "Find Apartment", progress: 100, status: "completed" },
    { phase: 2, name: "Book Movers", progress: 35, status: "active" },
    { phase: 3, name: "Update Addresses", progress: 0, status: "pending" },
  ],
  totalServicesDetected: 41,
  totalEmailsScanned: 3082,
  apartmentsFound: 8,
  moverQuotes: 5,
  activeAgents: 3,
};
