"use client";

import { OnboardingForm } from "@/components/landing/onboarding-form";
import { GtfoLogo } from "@/components/brand/gtfo-logo";
import { Building2, MapPin, Truck } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Find",
    description: "AI searches apartments across Zillow, Redfin & more",
  },
  {
    icon: MapPin,
    title: "Update",
    description: "Agents update your address on 40+ services automatically",
  },
  {
    icon: Truck,
    title: "Move",
    description: "Compare quotes and book movers in one click",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative dot grids */}
      <div className="absolute top-8 right-8 grid grid-cols-6 gap-1.5 opacity-20">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        ))}
      </div>
      <div className="absolute bottom-8 left-8 grid grid-cols-6 gap-1.5 opacity-20">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        ))}
      </div>
      {/* Accent line */}
      <div className="absolute top-8 left-8 w-8 h-1 bg-emerald-400 opacity-40" />

      <div className="text-center mb-8">
        <div className="mb-6 flex justify-center">
          <GtfoLogo size="xl" />
        </div>
        <p className="text-2xl md:text-3xl font-medium text-muted-foreground mb-2">
          Moving sucks. <span className="text-emerald-400 font-semibold">We don&apos;t.</span>
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mt-4">
          AI agents that find your apartment, update every address, and book your movers — so you can GTFO in peace.
        </p>
      </div>

      <OnboardingForm />

      <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg w-full">
        {steps.map((step) => (
          <div key={step.title} className="text-center">
            <div className="mx-auto w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
              <step.icon className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
