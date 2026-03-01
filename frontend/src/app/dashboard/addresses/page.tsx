"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Scan, Mail, Loader2, ExternalLink } from "lucide-react";
import { getDetectedServices, type DetectedService } from "@/lib/endpoints";

const categoryLabels: Record<string, string> = {
  banking: "Banking & Payments",
  investments: "Investments",
  shopping: "Shopping",
  utilities: "Utilities",
  insurance: "Insurance",
  government: "Government",
  medical: "Medical",
  subscriptions: "Subscriptions",
  travel: "Travel",
  food: "Food & Delivery",
  other: "Other",
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

const priorityDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-emerald-500",
  low: "bg-gray-400",
};

export default function AddressesPage() {
  const [services, setServices] = useState<DetectedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    getDetectedServices()
      .then(setServices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      category === "all"
        ? services
        : services.filter((s) => s.category === category),
    [services, category]
  );

  // Build category counts for filter badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: services.length };
    services.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [services]);

  const categories = [
    { key: "all", label: "All" },
    ...Object.entries(categoryLabels)
      .filter(([key]) => categoryCounts[key])
      .map(([key, label]) => ({ key, label })),
  ];

  const totalEmails = services.reduce((sum, s) => sum + s.emailCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading detected services...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-400">Failed to load services: {error}</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No detected services yet. Run address detection first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scan progress banner */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/20">
            <Scan className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Email Scan Complete</h3>
            <p className="text-sm text-muted-foreground">
              Detected{" "}
              <span className="text-foreground font-mono font-bold">{services.length}</span>{" "}
              services that need address updates
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span className="font-mono">{totalEmails.toLocaleString()} emails</span>
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <Badge
            key={cat.key}
            variant={category === cat.key ? "default" : "secondary"}
            className={cn(
              "cursor-pointer transition-colors px-3 py-1",
              category === cat.key
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "hover:bg-muted"
            )}
            onClick={() => setCategory(cat.key)}
          >
            {cat.label} ({categoryCounts[cat.key] || 0})
          </Badge>
        ))}
      </div>

      {/* Service table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Service</TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead>Needs Update</TableHead>
              <TableHead className="hidden md:table-cell text-right">Emails</TableHead>
              <TableHead className="text-right">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((service) => (
              <TableRow key={service._id}>
                <TableCell>
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      priorityDot[service.priority] || "bg-gray-400"
                    )}
                    title={`${service.priority} priority`}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{service.serviceName}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{service.category}</p>
                    {service.sampleSender && (
                      <p className="text-[10px] text-muted-foreground truncate max-w-48">
                        {service.sampleSender}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium capitalize",
                      categoryBadge[service.category] || categoryBadge.other
                    )}
                  >
                    {service.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium",
                      service.needsAddressUpdate
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-green-500/10 text-green-400 border-green-500/20"
                    )}
                  >
                    {service.needsAddressUpdate ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-right font-mono text-xs">
                  {service.emailCount}
                </TableCell>
                <TableCell className="text-right">
                  {service.settingsUrl && (
                    <a
                      href={service.settingsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Settings
                      </Button>
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
