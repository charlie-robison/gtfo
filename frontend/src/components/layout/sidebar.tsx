"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Truck,
  ShoppingCart,
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
import { usePipelineProgress } from "@/hooks/use-pipeline-progress";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/apartments", label: "Apartments", icon: Building2 },
  { href: "/dashboard/addresses", label: "Addresses", icon: MapPin },
  { href: "/dashboard/movers", label: "Movers", icon: Truck },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
];

function PhaseIndicator() {
  const phases = usePipelineProgress();

  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Pipeline Progress
      </p>
      <div className="space-y-2.5">
        {phases.map((phase) => (
          <div key={phase.phase} className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                phase.status === "completed" && "bg-green-500/20 text-green-400",
                phase.status === "active" && "bg-emerald-500/20 text-emerald-400",
                phase.status === "pending" && "bg-muted text-muted-foreground"
              )}
            >
              {phase.status === "completed" ? (
                <Check className="w-3 h-3" />
              ) : phase.status === "active" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Circle className="w-2.5 h-2.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-xs font-medium truncate",
                  phase.status === "completed" && "text-green-400",
                  phase.status === "active" && "text-emerald-400",
                  phase.status === "pending" && "text-muted-foreground"
                )}>
                  {phase.name}
                </span>
                <span className={cn(
                  "text-[10px] font-mono ml-2",
                  phase.status === "completed" && "text-green-400",
                  phase.status === "active" && "text-emerald-400",
                  phase.status === "pending" && "text-muted-foreground"
                )}>
                  {phase.progress}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    phase.status === "completed" && "bg-green-500",
                    phase.status === "active" && "bg-emerald-500"
                  )}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
            </div>
          </div>
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
    <aside className="hidden md:flex w-60 border-r bg-card flex-col h-screen sticky top-0 overflow-hidden">
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
