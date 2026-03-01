"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Loader2 } from "lucide-react";

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <Card className="w-full max-w-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-address">Current Address</Label>
            <Input
              id="current-address"
              placeholder="1234 Oak Valley Dr, El Dorado Hills CA"
              defaultValue="1234 Oak Valley Dr, El Dorado Hills CA 95762"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="target-city">Target City</Label>
              <Input
                id="target-city"
                placeholder="Sacramento, CA"
                defaultValue="Sacramento, CA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="move-date">Move Date</Label>
              <Input
                id="move-date"
                type="date"
                defaultValue="2026-04-01"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget</Label>
              <Select defaultValue="1400-2000">
                <SelectTrigger id="budget">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000-1400">$1,000 - $1,400</SelectItem>
                  <SelectItem value="1400-2000">$1,400 - $2,000</SelectItem>
                  <SelectItem value="2000-2500">$2,000 - $2,500</SelectItem>
                  <SelectItem value="2500+">$2,500+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Select defaultValue="2">
                <SelectTrigger id="bedrooms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bedroom</SelectItem>
                  <SelectItem value="2">2 Bedrooms</SelectItem>
                  <SelectItem value="3">3 Bedrooms</SelectItem>
                </SelectContent>
              </Select>
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
                Launching GTFO...
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
