"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          
          // Variants
          variant === "primary" && [
            "bg-gradient-to-r from-[#6366f1] to-[#8b5cf6]",
            "hover:from-[#5558e0] hover:to-[#7c4fe8]",
            "text-white",
            "focus:ring-[#6366f1]",
          ],
          variant === "secondary" && [
            "bg-[#1a1a26] border border-[#2a2a3a]",
            "hover:bg-[#222233] hover:border-[#3a3a4a]",
            "text-[#eeeef0]",
            "focus:ring-[#6366f1]",
          ],
          variant === "outline" && [
            "bg-transparent border border-[#6366f1]",
            "hover:bg-[rgba(99,102,241,0.1)]",
            "text-[#6366f1]",
            "focus:ring-[#6366f1]",
          ],
          variant === "ghost" && [
            "bg-transparent",
            "hover:bg-[rgba(255,255,255,0.05)]",
            "text-[#8888a0] hover:text-[#eeeef0]",
          ],
          
          // Sizes
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-4 py-2 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          
          className
        )}
        {...props}
      >
        {isLoading && (
          <span className="animate-spin">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
