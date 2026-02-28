"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoverQuote } from "@/types";
import { Star, Truck, Users, Shield, Clock, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuoteCard({ quote }: { quote: MoverQuote }) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        quote.isBestValue && "border-green-500/50"
      )}
    >
      {quote.isBestValue && (
        <div className="absolute top-0 right-0">
          <Badge className="rounded-none rounded-bl-lg bg-green-500 text-white text-[10px] gap-1">
            <Award className="w-3 h-3" />
            Best Value
          </Badge>
        </div>
      )}
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="text-lg font-bold">{quote.company}</h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{quote.rating}</span>
            <span className="text-xs text-muted-foreground">
              ({quote.reviewCount.toLocaleString()} reviews)
            </span>
          </div>
        </div>

        <div className="text-3xl font-bold">
          ${quote.price.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground ml-1">
            total
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Truck className="w-4 h-4" />
            <span>{quote.truckSize} truck</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {quote.workers > 0
                ? `${quote.workers} movers`
                : "Self-service"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>{quote.insurance ? "Insured" : "No insurance"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {quote.estimatedHours > 0
                ? `~${quote.estimatedHours} hrs`
                : "Flexible"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Available: {new Date(quote.availableDate).toLocaleDateString()}
          </p>
          <Button
            size="sm"
            className={cn(
              quote.isBestValue
                ? "bg-green-600 hover:bg-green-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            Book Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
