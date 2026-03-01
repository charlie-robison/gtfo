"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Users, Clock, MapPin, DollarSign, ArrowRight } from "lucide-react";
import { getUhaulInformation, type UhaulInformation } from "@/lib/endpoints";

export default function MoversPage() {
  const [bookings, setBookings] = useState<UhaulInformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUhaulInformation()
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading mover information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-400">Failed to load movers: {error}</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No mover bookings yet. Run the moving pipeline first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">U-Haul Bookings</h2>
        <Badge variant="secondary" className="text-xs">
          {bookings.length} booking{bookings.length !== 1 && "s"}
        </Badge>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bookings.map((booking) => (
          <Card key={booking._id} className="overflow-hidden">
            <CardContent className="p-5 space-y-4">
              {/* Vehicle & Provider */}
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold">{booking.vehicle}</h3>
                </div>
                {booking.movingHelpProvider && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Help by: {booking.movingHelpProvider}
                  </p>
                )}
              </div>

              {/* Total cost */}
              <div className="text-3xl font-bold">
                ${booking.totalCost.toLocaleString()}
                <span className="text-sm font-normal text-muted-foreground ml-1">total</span>
              </div>

              {/* Route */}
              <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Pickup</p>
                    <p className="font-medium">{booking.pickupLocation}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Drop-off</p>
                    <p className="font-medium">{booking.dropOffLocation}</p>
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{booking.pickupTime}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{booking.numWorkers} worker{booking.numWorkers !== 1 && "s"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{booking.numHours} hr{booking.numHours !== 1 && "s"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
