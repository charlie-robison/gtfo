"use client";

import { useState, useMemo } from "react";
import { ListingCard } from "@/components/apartments/listing-card";
import { ListingFilters } from "@/components/apartments/listing-filters";
import { mockListings } from "@/data/mock-listings";

export default function ApartmentsPage() {
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("score");

  const listings = useMemo(() => {
    let filtered =
      source === "all"
        ? mockListings
        : mockListings.filter((l) => l.source === source);

    return [...filtered].sort((a, b) => {
      if (sort === "score") return b.aiScore - a.aiScore;
      if (sort === "price-asc") return a.price - b.price;
      return b.price - a.price;
    });
  }, [source, sort]);

  return (
    <div className="space-y-6">
      <ListingFilters
        source={source}
        sort={sort}
        onSourceChange={setSource}
        onSortChange={setSort}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
