"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  movingPipeline,
  updateAmazonAddress,
  updateCashappAddress,
  updateDoordashAddress,
  updateSouthwestAddress,
  orderFurniture,
} from "@/lib/endpoints";

interface OverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OverrideDialog({ open, onOpenChange }: OverrideDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const val = (id: string) =>
      (form.elements.namedItem(id) as HTMLInputElement).value;

    const street = val("override-street");
    const city = val("override-city");
    const state = val("override-state");
    const zip = val("override-zip");
    const fullName = val("override-name");
    const phone = val("override-phone");

    const moveDate = val("override-move-date");
    const [year, month, day] = moveDate.split("-");
    const moveDateFormatted = `${month}/${day}/${year}`;

    const destination = `${street}, ${city}, ${state} ${zip}`;

    const addressUpdate = {
      street_address: street,
      city,
      state,
      zip_code: zip,
    };

    // Fire all 6 in parallel — calls Convex directly, no OpenClaw AI delay
    movingPipeline({ destination_address: destination, date: moveDateFormatted, pickup_time: "10:00 AM" }).catch(console.error);
    updateAmazonAddress({ full_name: fullName, phone, ...addressUpdate }).catch(console.error);
    updateCashappAddress(addressUpdate).catch(console.error);
    updateDoordashAddress(addressUpdate).catch(console.error);
    updateSouthwestAddress(addressUpdate).catch(console.error);
    orderFurniture().catch(console.error);

    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Override Destination</DialogTitle>
          <DialogDescription>
            Enter the new destination address. This will kick off the moving
            pipeline, update all service addresses, and order furniture.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="override-street">Street Address</Label>
            <Input
              id="override-street"
              placeholder="456 Oak Ave"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="override-city">City</Label>
              <Input
                id="override-city"
                placeholder="Sacramento"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-state">State</Label>
              <Input
                id="override-state"
                placeholder="CA"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-zip">Zip</Label>
              <Input
                id="override-zip"
                placeholder="95814"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="override-name">Full Name</Label>
              <Input
                id="override-name"
                placeholder="Charlie Robison"
                defaultValue="Charlie Robison"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="override-phone">Phone</Label>
              <Input
                id="override-phone"
                type="tel"
                placeholder="8083520499"
                defaultValue="8083520499"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-move-date">Move Date</Label>
            <Input
              id="override-move-date"
              type="date"
              defaultValue="2026-02-28"
              required
            />
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
                Launching...
              </>
            ) : (
              "Submit Override"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
