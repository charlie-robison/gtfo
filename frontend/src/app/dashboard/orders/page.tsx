"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Home,
  Sofa,
  ShoppingCart,
  Bed,
  Maximize,
  Truck,
  Users,
  Info,
} from "lucide-react";
import {
  getRecommendedFurniture,
  getAmazonOrderSummary,
  getHouseInformation,
  type RecommendedFurniture,
  type AmazonOrderSummary,
  type HouseInformation,
} from "@/lib/endpoints";

export default function OrdersPage() {
  const [furniture, setFurniture] = useState<RecommendedFurniture[]>([]);
  const [orderSummaries, setOrderSummaries] = useState<AmazonOrderSummary[]>([]);
  const [houseInfo, setHouseInfo] = useState<HouseInformation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getRecommendedFurniture(),
      getAmazonOrderSummary(),
      getHouseInformation(),
    ])
      .then(([f, o, h]) => {
        setFurniture(f);
        setOrderSummaries(o);
        setHouseInfo(h);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading order summary...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-400">Failed to load data: {error}</p>
      </div>
    );
  }

  const house = houseInfo[0] ?? null;

  // Group furniture by room
  const byRoom = furniture.reduce<Record<string, RecommendedFurniture[]>>((acc, item) => {
    const room = item.room || "Other";
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {});

  const hasAnyData = furniture.length > 0 || orderSummaries.length > 0 || house;

  if (!hasAnyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">No order data yet. Run the moving pipeline first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* House Analysis — justification section */}
      {house && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">House Analysis</h2>
          </div>

          <Card className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-5 space-y-4">
              <p className="text-sm">{house.description}</p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                    <p className="font-bold">{house.estimatedBedrooms}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sq Footage</p>
                    <p className="font-bold">{house.estimatedSquareFootage.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Truck Size</p>
                    <p className="font-bold">{house.recommendedTruckSize}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Workers</p>
                    <p className="font-bold">{house.recommendedWorkers}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume Estimate</p>
                    <p className="text-sm">{house.stuffVolumeEstimate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reasoning</p>
                    <p className="text-sm">{house.reasoning}</p>
                  </div>
                </div>
                {house.laborReasoning && (
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Labor Reasoning</p>
                      <p className="text-sm">{house.laborReasoning}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recommended Furniture */}
      {furniture.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sofa className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Recommended Furniture</h2>
            <Badge variant="secondary" className="text-xs">
              {furniture.length} item{furniture.length !== 1 && "s"}
            </Badge>
          </div>

          {Object.entries(byRoom).map(([room, items]) => (
            <div key={room} className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {room}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((item) => (
                  <Card key={item._id}>
                    <CardContent className="p-4 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Search: &quot;{item.amazonSearchQuery}&quot;
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          item.priority === "essential"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        )}
                      >
                        {item.priority}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Amazon Order Summaries */}
      {orderSummaries.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold">Order Summary</h2>
          </div>

          {orderSummaries.map((summary) => (
            <Card key={summary._id}>
              <CardContent className="p-5">
                <p className="text-sm whitespace-pre-wrap">{summary.summary}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
