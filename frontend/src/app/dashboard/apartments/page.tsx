"use client";

import { useState, useMemo, useEffect } from "react";
import { ListingCard } from "@/components/apartments/listing-card";
import { ListingFilters } from "@/components/apartments/listing-filters";
import { getRedfinApplications } from "@/lib/api";
import { RedfinApplication } from "@/types";

export default function ApartmentsPage() {
  const [sort, setSort] = useState("price-asc");
  const [status, setStatus] = useState("all");
  const [applications, setApplications] = useState<RedfinApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getRedfinApplications();
        if (!cancelled) setApplications(data);
      } catch (err) {
        console.error("Failed to load applications:", err);
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

  const listings = useMemo(() => {
    let filtered =
      status === "all"
        ? applications
        : applications.filter((a) => a.applicationStatus === status);

    return [...filtered].sort((a, b) => {
      if (sort === "price-asc") return a.monthlyRentPrice - b.monthlyRentPrice;
      if (sort === "price-desc") return b.monthlyRentPrice - a.monthlyRentPrice;
      if (sort === "move-in") return a.moveInCost - b.moveInCost;
      return 0;
    });
  }, [applications, status, sort]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading apartments...
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
        <p className="text-lg font-medium">No apartments found yet</p>
        <p className="text-sm">Run a rental search to find apartments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ListingFilters
        source={status}
        sort={sort}
        onSourceChange={setStatus}
        onSortChange={setSort}
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((app) => (
          <ListingCard key={app._id} application={app} />
        ))}
      </div>
    </div>
  );
}
