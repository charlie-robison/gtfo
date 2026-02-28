"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Truck,
  Bot,
  Menu,
  Check,
  Circle,
  Loader2,
} from "lucide-react";
import { GtfoLogo } from "@/components/brand/gtfo-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { mockPipelineState } from "@/data/mock-activity";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/apartments", label: "Apartments", icon: Building2 },
  { href: "/dashboard/addresses", label: "Addresses", icon: MapPin },
  { href: "/dashboard/movers", label: "Movers", icon: Truck },
  { href: "/dashboard/agents", label: "Live Agents", icon: Bot },
];

function PhaseIndicator() {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Pipeline Progress
      </p>
      <div className="flex items-center gap-2">
        {mockPipelineState.phases.map((phase, i) => (
          <div key={phase.phase} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                phase.status === "completed" &&
                  "bg-green-500/20 text-green-400",
                phase.status === "active" && "bg-emerald-500/20 text-emerald-400",
                phase.status === "pending" && "bg-muted text-muted-foreground"
              )}
            >
              {phase.status === "completed" ? (
                <Check className="w-3.5 h-3.5" />
              ) : phase.status === "active" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Circle className="w-3 h-3" />
              )}
            </div>
            {i < mockPipelineState.phases.length - 1 && (
              <div
                className={cn(
                  "w-4 h-0.5",
                  phase.status === "completed" ? "bg-green-500/50" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {mockPipelineState.phases.map((phase) => (
          <p key={phase.phase} className="text-[10px] text-muted-foreground flex-1 text-center">
            {phase.name}
          </p>
        ))}
      </div>
    </div>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={onNavigate}
        >
          <GtfoLogo size="sm" />
        </Link>
      </div>
      <Separator className="mx-4" />
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.label === "Live Agents" && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <Separator className="mx-4" />
      <PhaseIndicator />
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 border-r bg-card flex-col h-screen sticky top-0">
      <NavContent />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <NavContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
