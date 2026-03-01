"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ListingFiltersProps {
  source: string;
  sort: string;
  onSourceChange: (source: string) => void;
  onSortChange: (sort: string) => void;
}

const statuses = [
  { key: "all", label: "All" },
  { key: "found", label: "Found" },
  { key: "applying", label: "Applying" },
  { key: "applied", label: "Applied" },
  { key: "failed", label: "Failed" },
];

const sorts = [
  { key: "price-asc", label: "Price: Low" },
  { key: "price-desc", label: "Price: High" },
  { key: "move-in", label: "Move-in Cost" },
];

export function ListingFilters({
  source,
  sort,
  onSourceChange,
  onSortChange,
}: ListingFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Badge
            key={s.key}
            variant={source === s.key ? "default" : "secondary"}
            className={cn(
              "cursor-pointer transition-colors px-3 py-1",
              source === s.key
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "hover:bg-muted"
            )}
            onClick={() => onSourceChange(s.key)}
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
            onClick={() => onSortChange(s.key)}
          >
            {s.label}
          </Badge>
        ))}
      </div>
    </div>
  );
}
