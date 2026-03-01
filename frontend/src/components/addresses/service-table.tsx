"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AddressAccount, UpdateStatus, ServicePriority } from "@/types";
import { Eye, Loader2 } from "lucide-react";

interface ServiceTableProps {
  services: AddressAccount[];
  onReview: (service: AddressAccount) => void;
}

const statusConfig: Record<
  UpdateStatus,
  { label: string; className: string }
> = {
  detected: { label: "Detected", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  queued: { label: "Queued", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  in_progress: {
    label: "In Progress",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse",
  },
  needs_review: {
    label: "Needs Review",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const priorityDot: Record<ServicePriority, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-emerald-500",
  low: "bg-gray-400",
};

const categoryBadge: Record<string, string> = {
  banking: "bg-emerald-500/10 text-emerald-400",
  investments: "bg-purple-500/10 text-purple-400",
  shopping: "bg-pink-500/10 text-pink-400",
  utilities: "bg-orange-500/10 text-orange-400",
  insurance: "bg-cyan-500/10 text-cyan-400",
  government: "bg-indigo-500/10 text-indigo-400",
  medical: "bg-rose-500/10 text-rose-400",
  subscriptions: "bg-violet-500/10 text-violet-400",
  travel: "bg-sky-500/10 text-sky-400",
  food: "bg-yellow-500/10 text-yellow-400",
  other: "bg-gray-500/10 text-gray-400",
};

export function ServiceTable({ services, onReview }: ServiceTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Service</TableHead>
            <TableHead className="hidden sm:table-cell">Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell text-right">
              Emails
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const status = statusConfig[service.status];
            return (
              <TableRow key={service.id}>
                <TableCell>
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      priorityDot[service.priority]
                    )}
                    title={`${service.priority} priority`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{service.serviceName}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">
                      {service.category}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium capitalize",
                      categoryBadge[service.category]
                    )}
                  >
                    {service.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-medium", status.className)}
                  >
                    {service.status === "in_progress" && (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    )}
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-right font-mono text-xs">
                  {service.emailsFound}
                </TableCell>
                <TableCell className="text-right">
                  {service.status === "needs_review" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => onReview(service)}
                    >
                      <Eye className="w-3 h-3" />
                      Review
                    </Button>
                  )}
                  {service.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      Retry
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
