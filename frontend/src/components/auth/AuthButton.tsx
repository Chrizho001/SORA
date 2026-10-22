"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface AuthButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "outline";
  children: React.ReactNode;
}

export function AuthButton({
  isLoading = false,
  loadingText,
  variant = "primary",
  children,
  disabled,
  className = "",
  ...props
}: AuthButtonProps) {
  const isDisabled = disabled || isLoading;

  const baseStyles =
    "relative flex items-center justify-center gap-2 w-full h-[52px] px-6 rounded-full font-display font-medium text-[1rem] tracking-tight transition-all duration-300 ease-out select-none active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

  const variantStyles = {
    primary:
      "bg-night text-white shadow-button hover:bg-night-3 hover:shadow-lift focus-visible:ring-night disabled:opacity-50 disabled:pointer-events-none",
    secondary:
      "bg-canvas text-ink hover:bg-mist hover:text-night focus-visible:ring-fog disabled:opacity-50 disabled:pointer-events-none",
    outline:
      "bg-transparent border border-line text-ink hover:bg-mist hover:border-line-strong focus-visible:ring-night/20 disabled:opacity-50 disabled:pointer-events-none",
  };

  return (
    <button
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {/* Loading Spinner */}
      {isLoading && (
        <Loader2 className="size-4 animate-spin text-current shrink-0" />
      )}

      {/* Button Text */}
      <span className="truncate">
        {isLoading && loadingText ? loadingText : children}
      </span>
    </button>
  );
}
