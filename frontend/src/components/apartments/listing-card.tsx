"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Listing, ApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Bed, Bath, Maximize, ExternalLink } from "lucide-react";
import Image from "next/image";

const statusConfig: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  found: {
    label: "Found",
    className: "bg-gray-500/10 text-gray-400",
  },
  applying: {
    label: "Applying",
    className: "bg-emerald-500/10 text-emerald-400 animate-pulse",
  },
  applied: {
    label: "Applied",
    className: "bg-amber-500/10 text-amber-400",
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-500/10 text-green-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-400",
  },
};

function AiScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "border-green-500 text-green-400"
      : score >= 50
        ? "border-amber-500 text-amber-400"
        : "border-red-500 text-red-400";

  return (
    <div
      className={cn(
        "absolute top-3 right-3 w-11 h-11 rounded-full border-2 flex items-center justify-center bg-black/60 backdrop-blur-sm text-sm font-bold",
        color
      )}
    >
      {score}
    </div>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  const status = statusConfig[listing.applicationStatus];

  return (
    <Card className="overflow-hidden group">
      <div className="relative h-44 bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.imageUrl}
          alt={listing.address}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <AiScoreBadge score={listing.aiScore} />
        <Badge
          className={cn(
            "absolute top-3 left-3 text-[10px]",
            status.className
          )}
        >
          {status.label}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xl font-bold">
              ${listing.price.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <p className="text-sm text-muted-foreground">{listing.address}</p>
          </div>
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">
            {listing.source}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" />
            {listing.bedrooms} bd
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {listing.bathrooms} ba
          </span>
          <span className="flex items-center gap-1">
            <Maximize className="w-3.5 h-3.5" />
            {listing.sqft.toLocaleString()} sqft
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {listing.features.slice(0, 4).map((f) => (
            <Badge
              key={f}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {f}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
