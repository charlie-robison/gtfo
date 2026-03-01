"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { askOpenClaw } from "@/lib/openclaw";

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

    const moveDate = val("move-in-date");
    const [year, month, day] = moveDate.split("-");
    const moveDateFormatted = `${month}/${day}/${year}`;

    const message = [
      `Full Name: ${val("full-name")}`,
      `Phone: ${val("phone")}`,
      `Initial Address: ${val("initial-address")}`,
      `Landlord Email: ${val("landlord-email")}`,
      `City: ${val("city")}`,
      `State: ${val("state")}`,
      `Move-in Date: ${moveDateFormatted}`,
      `Budget: $${val("budget")}`,
      `Min Bedrooms: ${val("min-bedrooms")}`,
      `Min Bathrooms: ${val("min-bathrooms")}`,
    ].join("\n");

    // Fire-and-forget — navigate immediately, let OpenClaw run in the background
    askOpenClaw(message).catch((err) =>
      console.error("OpenClaw error:", err)
    );

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
                defaultValue="Charlie Robison"
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
              placeholder="7263 Kanoenoe Street"
              defaultValue="7263 Kanoenoe Street"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="landlord-email">Landlord Email</Label>
            <Input
              id="landlord-email"
              type="email"
              placeholder="landlord@example.com"
              defaultValue="landlord@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="El Dorado Hills"
                defaultValue="El Dorado Hills"
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
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="move-in-date">Move-in Date</Label>
              <Input
                id="move-in-date"
                type="date"
                defaultValue="2026-02-28"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                type="number"
                placeholder="5000"
                defaultValue="5000"
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
