"use client";

import { cn } from "@/lib/utils";

interface AllInBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function AllInBadge({ className, size = "md" }: AllInBadgeProps) {
  return (
    <span
      className={cn(
        "bg-red-600 text-white font-bold rounded animate-pulse",
        size === "sm" ? "px-1 py-0.5 text-[8px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      ALL IN
    </span>
  );
}
