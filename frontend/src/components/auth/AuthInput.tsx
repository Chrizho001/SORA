"use client";

import React, { useState, forwardRef, useId } from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export interface AuthInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isValid?: boolean;
  hint?: string;
  onFocusChange?: (focused: boolean) => void;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      error,
      isValid = false,
      hint,
      type = "text",
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onFocusChange,
      className = "",
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const computedType = isPassword ? (showPassword ? "text" : "password") : type;

    // Check if input has content to keep floating label active
    const hasValue =
      value !== undefined && value !== null && String(value).length > 0;
    const isFloating = isFocused || hasValue;

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocusChange?.(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onFocusChange?.(false);
      onBlur?.(e);
    };

    return (
      <div className={`relative flex flex-col w-full text-left group ${className}`}>
        {/* Input Wrapper Card */}
        <div
          className={`relative flex items-center w-full min-h-[58px] px-4 pt-4 pb-1 rounded-xl transition-all duration-300 ease-out border ${
            error
              ? "bg-red-50/20 border-red-400/80 shadow-[0_0_0_1px_rgba(239,68,68,0.3)]"
              : isFocused
              ? "bg-white border-night shadow-[0_2px_12px_rgba(17,19,24,0.06)]"
              : "bg-surface/80 border-line hover:border-line-strong hover:bg-white"
          } ${disabled ? "opacity-60 cursor-not-allowed bg-canvas/40" : ""}`}
        >
          {/* Animated Floating Label */}
          <label
            htmlFor={inputId}
            className={`absolute left-4 pointer-events-none transition-all duration-200 ease-out select-none origin-left ${
              isFloating
                ? "top-1.5 text-[0.7rem] font-medium tracking-wider uppercase " +
                  (error
                    ? "text-red-600"
                    : isFocused
                    ? "text-ink font-semibold"
                    : "text-muted")
                : "top-1/2 -translate-y-1/2 text-[0.95rem] " +
                  (error ? "text-red-500" : "text-muted")
            }`}
          >
            {label}
          </label>

          {/* Actual Input Element */}
          <input
            ref={ref}
            id={inputId}
            type={computedType}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="w-full bg-transparent text-ink text-[1rem] leading-snug outline-none border-none placeholder-transparent pt-1 font-body focus:ring-0"
            {...props}
          />

          {/* Right Action Icons (Show/Hide Password, Validation Check, Error Alert) */}
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Valid Checkmark Icon */}
            {isValid && !error && hasValue && (
              <span className="text-emerald-600 animate-in fade-in zoom-in duration-200">
                <CheckCircle2 className="size-4" strokeWidth={2.5} />
              </span>
            )}

            {/* Error Alert Icon */}
            {error && (
              <span className="text-red-500 animate-in fade-in zoom-in duration-200">
                <AlertCircle className="size-4" strokeWidth={2.5} />
              </span>
            )}

            {/* Password Toggle Button */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 rounded-md text-subtle hover:text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-night/20"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            )}
          </div>

          {/* Animated Active Bottom Bar Indicator */}
          <span
            className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-transform duration-300 origin-center ease-[cubic-bezier(0.16,1,0.3,1)] ${
              error
                ? "bg-red-500 scale-x-100"
                : isFocused
                ? "bg-night scale-x-100"
                : "scale-x-0"
            }`}
          />
        </div>

        {/* Real-time Error Notification */}
        {error && (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 mt-1.5 px-1 text-xs text-red-600 font-medium animate-in slide-in-from-top-1 fade-in duration-200"
          >
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Optional Hint Text */}
        {!error && hint && (
          <p className="mt-1 px-1 text-xs text-subtle">{hint}</p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = "AuthInput";
