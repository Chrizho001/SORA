"use client";

import React, { useEffect, useRef, useId, useCallback } from "react";
import { X } from "lucide-react";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = "",
  showCloseButton = true,
}: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusedRef = useRef<HTMLElement | null>(null);

  // Store previously focused element and return focus upon close
  useEffect(() => {
    if (isOpen) {
      prevFocusedRef.current = document.activeElement as HTMLElement | null;
    } else if (prevFocusedRef.current) {
      prevFocusedRef.current.focus();
      prevFocusedRef.current = null;
    }
  }, [isOpen]);

  // Handle Escape key and focus trapping
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const dialogNode = dialogRef.current;
        if (!dialogNode) return;

        const focusableSelectors = [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(", ");

        const focusableElements = Array.from(
          dialogNode.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null); // visible elements only

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || document.activeElement === dialogNode) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("keydown", handleKeyDown);

    // Initial focus: first focusable element or dialog container
    const timer = setTimeout(() => {
      const dialogNode = dialogRef.current;
      if (!dialogNode) return;

      const firstInputOrButton = dialogNode.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([aria-label="Close dialog"])'
      );

      if (firstInputOrButton) {
        firstInputOrButton.focus();
      } else {
        const anyFocusable = dialogNode.querySelector<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (anyFocusable) {
          anyFocusable.focus();
        } else {
          dialogNode.focus();
        }
      }
    }, 20);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full max-w-lg rounded-3xl bg-surface border border-line p-6 shadow-2xl text-ink focus:outline-none animate-in zoom-in-95 duration-150 ${className}`}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-line mb-4">
          <div className="min-w-0 pr-2">
            <h2 id={titleId} className="font-display font-bold text-lg text-ink tracking-tight">
              {title}
            </h2>
            {description && (
              <p id={descId} className="text-xs text-muted font-body mt-0.5">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors shrink-0"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
