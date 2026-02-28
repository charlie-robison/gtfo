"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, Truck, Bot } from "lucide-react";
import { mockPipelineState } from "@/data/mock-activity";

const stats = [
  {
    label: "Apartments Found",
    value: mockPipelineState.apartmentsFound,
    icon: Building2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Services Detected",
    value: mockPipelineState.totalServicesDetected,
    icon: MapPin,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    label: "Mover Quotes",
    value: mockPipelineState.moverQuotes,
    icon: Truck,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    label: "Active Agents",
    value: mockPipelineState.activeAgents,
    icon: Bot,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
