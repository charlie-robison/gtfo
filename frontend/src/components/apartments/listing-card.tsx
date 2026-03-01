"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RedfinApplication, ApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Bed, Bath, Maximize, ExternalLink } from "lucide-react";

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
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400",
  },
};

export function ListingCard({ application }: { application: RedfinApplication }) {
  const status = statusConfig[application.applicationStatus] ?? statusConfig.found;

  return (
    <Card className="overflow-hidden group">
      <div className="relative h-44 bg-muted">
        {application.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={application.imageUrl}
            alt={application.address}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        <Badge
          className={cn(
            "absolute top-3 left-3 text-[10px]",
            status.className
          )}
        >
          {status.label}
        </Badge>
        {application.url && (
          <a
            href={application.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xl font-bold">
              ${application.monthlyRentPrice.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">
                /mo
              </span>
            </p>
            <p className="text-sm text-muted-foreground truncate" title={application.address}>
              {application.address}
            </p>
            {application.name && (
              <p className="text-xs text-muted-foreground truncate" title={application.name}>
                {application.name}
              </p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] capitalize shrink-0">
            redfin
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5" />
            {application.numBedrooms} bd
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5" />
            {application.numBathrooms} ba
          </span>
          {application.squareFootage > 0 && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5" />
              {application.squareFootage.toLocaleString()} sqft
            </span>
          )}
        </div>

        {application.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {application.description}
          </p>
        )}

        {application.moveInCost > 0 && (
          <p className="text-xs text-muted-foreground">
            Move-in: ${application.moveInCost.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
