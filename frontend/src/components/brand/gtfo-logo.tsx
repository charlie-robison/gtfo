"use client";

import { cn } from "@/lib/utils";

interface GtfoLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: { text: "text-xl", circle: "w-5 h-5", innerCircle: "w-2.5 h-2.5", dot: "w-2 h-2", gap: "gap-0" },
  md: { text: "text-3xl", circle: "w-8 h-8", innerCircle: "w-4 h-4", dot: "w-3 h-3", gap: "gap-0.5" },
  lg: { text: "text-5xl", circle: "w-12 h-12", innerCircle: "w-6 h-6", dot: "w-4 h-4", gap: "gap-1" },
  xl: { text: "text-7xl md:text-8xl", circle: "w-16 h-16 md:w-20 md:h-20", innerCircle: "w-8 h-8 md:w-10 md:h-10", dot: "w-5 h-5 md:w-6 md:h-6", gap: "gap-1" },
};

export function GtfoLogo({ size = "md", className }: GtfoLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("inline-flex items-end", s.gap, className)}>
      <span className={cn("font-black tracking-tighter leading-none", s.text)}>GTF</span>
      {/* Concentric circles for the O */}
      <div className={cn("relative flex items-center justify-center rounded-full border-2 border-emerald-400 self-center", s.circle)}>
        <div className={cn("rounded-full border-2 border-emerald-400", s.innerCircle)} />
      </div>
      {/* Green dot — sits at baseline like a period */}
      <div className={cn("rounded-full bg-emerald-400 ml-0.5 mb-1", s.dot)} />
    </div>
  );
}
