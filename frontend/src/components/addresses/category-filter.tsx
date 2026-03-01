"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ServiceCategory } from "@/types";
import { mockServices, categoryLabels } from "@/data/mock-services";

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const counts: Record<string, number> = { all: mockServices.length };
  mockServices.forEach((s) => {
    counts[s.category] = (counts[s.category] || 0) + 1;
  });

  const categories = [
    { key: "all", label: "All" },
    ...Object.entries(categoryLabels)
      .filter(([key]) => counts[key])
      .map(([key, label]) => ({ key, label })),
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <Badge
          key={cat.key}
          variant={selected === cat.key ? "default" : "secondary"}
          className={cn(
            "cursor-pointer transition-colors px-3 py-1",
            selected === cat.key
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "hover:bg-muted"
          )}
          onClick={() => onSelect(cat.key)}
        >
          {cat.label} ({counts[cat.key] || 0})
        </Badge>
      ))}
    </div>
  );
}
