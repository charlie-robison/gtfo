"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  searchRentals,
  cancelCurrentLease,
  determineAddresses,
} from "@/lib/endpoints";

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setStatus("Launching GTFO pipeline...");

    const form = e.currentTarget;
    const val = (id: string) =>
      (form.elements.namedItem(id) as HTMLInputElement).value;

    const fullName = val("full-name");
    const phone = val("phone");
    const initialAddress = val("initial-address");
    const landlordEmail = val("landlord-email");
    const city = val("city");
    const state = val("state");
    const zipcode = val("zipcode");
    const budget = Number(val("budget"));
    const minBedrooms = Number(val("min-bedrooms"));
    const minBathrooms = Number(val("min-bathrooms"));

    const moveDate = val("move-in-date");
    const [year, month, day] = moveDate.split("-");
    const moveDateFormatted = `${month}/${day}/${year}`;

    // Fire all 3 in parallel — no OpenClaw delay
    // 1. Search rentals (backend auto-triggers apply jobs once listings are found)
    searchRentals({
      budget,
      city,
      state,
      zipcode,
      full_name: fullName,
      phone,
      move_in_date: moveDateFormatted,
      min_bedrooms: minBedrooms,
      min_bathrooms: minBathrooms,
      initial_address: initialAddress,
    }).catch(console.error);

    // 2. Cancel current lease
    cancelCurrentLease({
      landlord_email: landlordEmail,
      tenant_name: fullName,
      current_address: initialAddress,
      lease_end_date: moveDateFormatted,
      move_out_date: moveDateFormatted,
    }).catch(console.error);

    // 3. Determine addresses (email scan)
    determineAddresses({
      old_street: initialAddress,
      old_city: city,
      old_state: state,
    }).catch(console.error);

    router.push("/dashboard");
  };

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                placeholder="Charlie Robison"
                defaultValue="Brycen Mcormick"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="8083520499"
                defaultValue="8083520499"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial-address">Initial Address</Label>
            <Input
              id="initial-address"
              placeholder="5122 Mertola Drive"
              defaultValue="5122 Mertola Drive"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlord-email">Landlord Email</Label>
            <Input
              id="landlord-email"
              type="email"
              placeholder="charlierobison480@gmail.com"
              defaultValue="charlierobison480@gmail.com"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="San Francisco"
                defaultValue="San Francisco"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="CA"
                defaultValue="CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipcode">Zip</Label>
              <Input
                id="zipcode"
                placeholder="94102"
                defaultValue="94102"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="move-in-date">Move-in Date</Label>
              <Input
                id="move-in-date"
                type="date"
                defaultValue="2026-03-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                placeholder="10000"
                defaultValue="10000"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-bedrooms">Beds</Label>
                <Input
                  id="min-bedrooms"
                  type="number"
                  placeholder="3"
                  defaultValue="3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-bathrooms">Baths</Label>
                <Input
                  id="min-bathrooms"
                  type="number"
                  placeholder="3"
                  defaultValue="3"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {status || "Launching GTFO..."}
              </>
            ) : (
              <>
                Launch GTFO
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
