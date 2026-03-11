"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium font-mono",
        variant === "default" && "bg-[#2a2a3a] text-[#8888a0]",
        variant === "success" && "bg-[rgba(0,212,170,0.1)] text-[#00d4aa] border border-[rgba(0,212,170,0.2)]",
        variant === "warning" && "bg-[rgba(255,184,0,0.1)] text-[#ffb800] border border-[rgba(255,184,0,0.2)]",
        variant === "error" && "bg-[rgba(255,61,90,0.1)] text-[#ff3d5a] border border-[rgba(255,61,90,0.2)]",
        variant === "info" && "bg-[rgba(99,102,241,0.1)] text-[#6366f1] border border-[rgba(99,102,241,0.2)]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
