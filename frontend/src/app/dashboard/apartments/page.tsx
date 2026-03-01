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

  useEffect(() => {
    getRedfinApplications()
      .then(setListings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    return [...listings].sort((a, b) => {
      if (sort === "price-asc") return a.monthlyRentPrice - b.monthlyRentPrice;
      if (sort === "price-desc") return b.monthlyRentPrice - a.monthlyRentPrice;
      return a.moveInCost - b.moveInCost;
    });
  }, [listings, sort]);

  const sorts = [
    { key: "price-asc", label: "Price: Low" },
    { key: "price-desc", label: "Price: High" },
    { key: "movein", label: "Move-in Cost" },
  ];

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
      {/* Sort filters */}
      <div className="flex flex-wrap gap-2">
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
          {listings.length} listing{listings.length !== 1 && "s"}
        </Badge>
      </div>

      {/* Listing grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((listing) => (
          <Card key={listing._id} className="overflow-hidden group">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-bold">
                    ${listing.monthlyRentPrice.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{listing.address}</p>
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

              {listing.moveInCost > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-muted-foreground">Move-in cost:</span>
                  <span className="font-mono font-medium">${listing.moveInCost.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
