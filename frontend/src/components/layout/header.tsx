"use client";

import { usePathname } from "next/navigation";
import { MobileNav } from "./sidebar";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { mockUser } from "@/data/mock-user";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/apartments": "Apartments",
  "/dashboard/addresses": "Address Updates",
  "/dashboard/movers": "Movers",
  "/dashboard/orders": "Order Summary",
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-4 md:px-6 h-14">
      <MobileNav />
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        <Badge
          variant="secondary"
          className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1 border-emerald-500/20"
        >
          {mockUser.oldAddress.city}
          <ArrowRight className="w-3 h-3 text-emerald-400" />
          {mockUser.newAddress.city}
          <span className="text-muted-foreground">|</span>
          Apr 1, 2026
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
