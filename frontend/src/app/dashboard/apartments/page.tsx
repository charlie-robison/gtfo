"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bed, Bath, Maximize, ExternalLink, Loader2, DollarSign } from "lucide-react";
import { getRedfinApplications, type RedfinApplication } from "@/lib/endpoints";

export default function ApartmentsPage() {
  const [listings, setListings] = useState<RedfinApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState("price-asc");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getRedfinApplications();
        if (!cancelled) {
          setListings(data);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    // Poll every 5s for live updates while apply jobs run
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const sorted = useMemo(() => {
    let filtered =
      status === "all"
        ? listings
        : listings.filter((l) => l.applicationStatus === status);

    return [...filtered].sort((a, b) => {
      if (sort === "price-asc") return a.monthlyRentPrice - b.monthlyRentPrice;
      if (sort === "price-desc") return b.monthlyRentPrice - a.monthlyRentPrice;
      return a.moveInCost - b.moveInCost;
    });
  }, [listings, status, sort]);

  const sorts = [
    { key: "price-asc", label: "Price: Low" },
    { key: "price-desc", label: "Price: High" },
    { key: "movein", label: "Move-in Cost" },
  ];

  const statuses = [
    { key: "all", label: "All" },
    { key: "found", label: "Found" },
    { key: "applying", label: "Applying" },
    { key: "applied", label: "Applied" },
    { key: "failed", label: "Failed" },
  ];

  const statusColors: Record<string, string> = {
    found: "bg-gray-500/10 text-gray-400",
    applying: "bg-emerald-500/10 text-emerald-400 animate-pulse",
    applied: "bg-amber-500/10 text-amber-400",
    failed: "bg-red-500/10 text-red-400",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading apartments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-400">Failed to load apartments: {error}</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No apartments found yet. Run a rental search first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <Badge
              key={s.key}
              variant={status === s.key ? "default" : "secondary"}
              className={cn(
                "cursor-pointer transition-colors px-3 py-1",
                status === s.key
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "hover:bg-muted"
              )}
              onClick={() => setStatus(s.key)}
            >
              {s.label}
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          {sorts.map((s) => (
            <Badge
              key={s.key}
              variant={sort === s.key ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors px-3 py-1",
                sort === s.key && "bg-emerald-500 hover:bg-emerald-600 text-white"
              )}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </Badge>
          ))}
          <Badge variant="secondary" className="ml-auto text-xs">
            {sorted.length} listing{sorted.length !== 1 && "s"}
          </Badge>
        </div>
      </div>

      {/* Listing grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((listing) => (
          <Card key={listing._id} className="overflow-hidden group">
            {listing.imageUrl && (
              <div className="relative h-44 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={listing.imageUrl}
                  alt={listing.address}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <Badge
                  className={cn(
                    "absolute top-3 left-3 text-[10px]",
                    statusColors[listing.applicationStatus] ?? statusColors.found
                  )}
                >
                  {listing.applicationStatus}
                </Badge>
              </div>
            )}
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-bold">
                    ${listing.monthlyRentPrice.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{listing.address}</p>
                  {listing.name && (
                    <p className="text-xs text-muted-foreground truncate" title={listing.name}>
                      {listing.name}
                    </p>
                  )}
                </div>
                {listing.url && (
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-emerald-400 transition-colors shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" />
                  {listing.numBedrooms} bd
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {listing.numBathrooms} ba
                </span>
                {listing.squareFootage > 0 && (
                  <span className="flex items-center gap-1">
                    <Maximize className="w-3.5 h-3.5" />
                    {listing.squareFootage.toLocaleString()} sqft
                  </span>
                )}
              </div>

              {listing.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {listing.description}
                </p>
              )}

              {listing.moveInCost > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-muted-foreground">Move-in cost:</span>
                  <span className="font-mono font-medium">${listing.moveInCost.toLocaleString()}</span>
                </div>
              )}

              {!listing.imageUrl && (
                <Badge
                  className={cn(
                    "text-[10px]",
                    statusColors[listing.applicationStatus] ?? statusColors.found
                  )}
                >
                  {listing.applicationStatus}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
