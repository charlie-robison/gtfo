"use client";

import { useState } from "react";
import { ScanProgress } from "@/components/addresses/scan-progress";
import { CategoryFilter } from "@/components/addresses/category-filter";
import { ServiceTable } from "@/components/addresses/service-table";
import { ApprovalDialog } from "@/components/addresses/approval-dialog";
import { mockServices } from "@/data/mock-services";
import { AddressAccount } from "@/types";

export default function AddressesPage() {
  const [category, setCategory] = useState("all");
  const [reviewService, setReviewService] = useState<AddressAccount | null>(
    null
  );

  const filtered =
    category === "all"
      ? mockServices
      : mockServices.filter((s) => s.category === category);

  return (
    <div className="space-y-6">
      <ScanProgress />
      <CategoryFilter selected={category} onSelect={setCategory} />
      <ServiceTable services={filtered} onReview={setReviewService} />
      <ApprovalDialog
        service={reviewService}
        open={!!reviewService}
        onOpenChange={(open) => {
          if (!open) setReviewService(null);
        }}
      />
    </div>
  );
}
